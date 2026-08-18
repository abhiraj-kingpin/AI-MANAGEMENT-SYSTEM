/**
 * @jest-environment <rootDir>/tests/utils/realGlobalsNodeEnv.js
 */
import sharp from 'sharp';
import {
  REFERENCE_KEYPOINTS_112,
  type Point2D,
} from '../../../src/modules/face-recognition/faceAlign';
import type { FaceBoundingBox } from '../../../src/modules/face-recognition/faceDetector';
import * as faceDetectorModule from '../../../src/modules/face-recognition/faceDetector';
import {
  generateFaceEmbedding,
  NoFaceDetectedError,
} from '../../../src/modules/face-recognition/faceEmbedding.provider';

const { detectFaces } = faceDetectorModule;

/**
 * `faceDetector.test.ts` and `faceEmbedding.provider.test.ts` used to be two
 * separate files. Jest gives every test *file* its own fresh module
 * registry — so each one independently required `onnxruntime-node`, and
 * each one's own copy of its `ortInitialized` guard (module-scoped in
 * `onnxruntime-node/dist/binding.js`) started at `false`. Both created a
 * real `InferenceSession` for real, so both called the native
 * `initOrtOnce()` — which only checks its OWN guard, not whether some
 * *other* Jest-sandboxed copy of the same module already called it once
 * for this process. The second call re-registered a native environment
 * cleanup hook that was already registered by the first, tripping Node's
 * own internal duplicate-registration assertion in `CleanupQueue::Add` —
 * a hard process abort (SIGABRT), not a catchable JS error, not something
 * try/catch around `InferenceSession.create()` could ever have caught.
 * Confirmed by reproducing it locally (not just on CI) once looked for
 * directly, then reading the actual native assertion in the crash output.
 *
 * The real fix is structural: both real model sessions have to be created
 * within the *same* Jest module registry, so `onnxruntime-node`'s own
 * "only once" guard is actually checking the same state both times — i.e.
 * the same physical test file. Merged here for exactly that reason, not
 * for organizational convenience.
 *
 * That merge is what forces `detectFaces` to be handled with `jest.spyOn`
 * instead of `jest.mock(...)` in the embedding-provider suite below —
 * `jest.mock` replaces the whole module with a fully fake one, which would
 * again mean two different "versions" of the detector module coexisting
 * (real one used by its own suite, fake one used by the other) — spying on
 * the one real, shared import and restoring it after each test keeps both
 * suites correct without reintroducing a second module identity.
 */
function flatImage(
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

const MODEL_TEST_TIMEOUT = 20_000;

describe('detectFaces (real SCRFD detector)', () => {
  /**
   * What's genuinely verifiable here without real photos of real faces: a
   * flat, featureless synthetic image produces zero detections (there's
   * nothing face-like in it), the pipeline is deterministic, results are
   * shaped correctly, and different image sizes/aspect ratios don't crash
   * the resize/pad math. What's NOT verifiable: that a real face is
   * actually detected, or that the bounding box/landmarks would be
   * accurate on one — this environment has no photos of real people to
   * test that against.
   */
  it(
    'detects nothing in a flat, featureless image',
    async () => {
      const image = await flatImage(320, 240, { r: 128, g: 128, b: 128 });

      const detections = await detectFaces(image);

      expect(detections).toEqual([]);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'is deterministic — the same image always produces the same detections',
    async () => {
      const image = await flatImage(400, 300, { r: 90, g: 110, b: 130 });

      const a = await detectFaces(image);
      const b = await detectFaces(image);

      expect(a).toEqual(b);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'every returned detection is correctly shaped (score in [0,1], a valid bbox, 5 keypoints)',
    async () => {
      // A busier synthetic pattern than a flat color, to exercise the
      // scoring path with something other than uniform input — still not
      // expected to contain a real face, so an empty result is fine too;
      // the point is that *if* anything crosses threshold, its shape is
      // sane.
      const size = 256;
      const noisy = Buffer.alloc(size * size * 3);
      for (let i = 0; i < noisy.length; i++) noisy[i] = (i * 37) % 256;
      const image = await sharp(noisy, { raw: { width: size, height: size, channels: 3 } })
        .jpeg()
        .toBuffer();

      const detections = await detectFaces(image);

      for (const d of detections) {
        expect(d.score).toBeGreaterThanOrEqual(0);
        expect(d.score).toBeLessThanOrEqual(1);
        expect(d.bbox.x2).toBeGreaterThan(d.bbox.x1);
        expect(d.bbox.y2).toBeGreaterThan(d.bbox.y1);
        expect(d.keypoints).toHaveLength(5);
      }
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'does not crash on a wide, non-square image',
    async () => {
      const image = await flatImage(800, 200, { r: 40, g: 40, b: 40 });
      await expect(detectFaces(image)).resolves.toEqual([]);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'does not crash on a tall, non-square image',
    async () => {
      const image = await flatImage(200, 800, { r: 40, g: 40, b: 40 });
      await expect(detectFaces(image)).resolves.toEqual([]);
    },
    MODEL_TEST_TIMEOUT,
  );
});

/**
 * These run the REAL faceEmbedding.provider.ts embedding step end-to-end —
 * real sharp preprocessing, real alignment warp (`faceAlign.ts`, already
 * independently verified in `faceAlign.test.ts`), real ONNX inference
 * against the actual `w600k_mbf.onnx` file (see that module's own doc
 * comment for exactly what this is and isn't verified to do).
 *
 * Detection itself (`faceDetector.ts`) is spied on rather than
 * re-exercised — it has its own dedicated, real (unmocked) coverage right
 * above in this same file, and a synthetic procedural image reliably
 * fooling a real trained detector into seeing a face isn't something this
 * environment can construct (unlike the detector's own tests, which only
 * need it to correctly find *nothing* in a featureless image — a real,
 * verifiable negative case). `face.service.test.ts` mocks this whole
 * module for everything that doesn't need to exercise it for real.
 */
function fakeImage(
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

/** A plausible detection roughly centered in a `width`×`height` image — placed by scaling the reference template itself, so the alignment transform this exercises is a real, non-trivial (not identity) one. */
function fakeDetection(
  width: number,
  height: number,
): { score: number; bbox: FaceBoundingBox; keypoints: Point2D[] } {
  const scale = Math.min(width, height) / 130;
  const offsetX = width / 2 - 56 * scale;
  const offsetY = height / 2 - 72 * scale;
  const keypoints = REFERENCE_KEYPOINTS_112.map((p) => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY,
  }));
  return {
    score: 0.9,
    bbox: { x1: offsetX, y1: offsetY, x2: offsetX + 112 * scale, y2: offsetY + 112 * scale },
    keypoints,
  };
}

describe('generateFaceEmbedding (real MobileFaceNet provider)', () => {
  let detectFacesSpy: jest.SpiedFunction<typeof faceDetectorModule.detectFaces>;

  beforeEach(() => {
    detectFacesSpy = jest.spyOn(faceDetectorModule, 'detectFaces').mockResolvedValue([]);
  });

  afterEach(() => {
    detectFacesSpy.mockRestore();
  });

  it(
    'is deterministic — the same image and detection always produce the same vector',
    async () => {
      const image = await fakeImage(300, 300, { r: 120, g: 100, b: 90 });
      detectFacesSpy.mockResolvedValue([fakeDetection(300, 300)]);

      const a = await generateFaceEmbedding(image);
      const b = await generateFaceEmbedding(image);

      expect(a.vector).toEqual(b.vector);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'produces different vectors for visibly different images',
    async () => {
      detectFacesSpy.mockResolvedValue([fakeDetection(300, 300)]);
      const a = await generateFaceEmbedding(await fakeImage(300, 300, { r: 10, g: 10, b: 10 }));
      const b = await generateFaceEmbedding(await fakeImage(300, 300, { r: 240, g: 200, b: 180 }));

      expect(a.vector).not.toEqual(b.vector);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'produces a 512-dimensional, unit-normalized vector',
    async () => {
      detectFacesSpy.mockResolvedValue([fakeDetection(300, 300)]);
      const { vector } = await generateFaceEmbedding(
        await fakeImage(300, 300, { r: 128, g: 128, b: 128 }),
      );

      expect(vector).toHaveLength(512);
      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1, 5);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'returns a quality score in [0, 1]',
    async () => {
      detectFacesSpy.mockResolvedValue([fakeDetection(300, 300)]);
      const { qualityScore } = await generateFaceEmbedding(
        await fakeImage(300, 300, { r: 50, g: 60, b: 70 }),
      );

      expect(qualityScore).toBeGreaterThanOrEqual(0);
      expect(qualityScore).toBeLessThanOrEqual(1);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'throws NoFaceDetectedError when detectFaces finds nothing, rather than running inference on nothing',
    async () => {
      detectFacesSpy.mockResolvedValue([]);

      await expect(
        generateFaceEmbedding(await fakeImage(200, 200, { r: 1, g: 1, b: 1 })),
      ).rejects.toThrow(NoFaceDetectedError);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'picks the highest-scoring detection when more than one face is found',
    async () => {
      const image = await fakeImage(300, 300, { r: 80, g: 90, b: 100 });
      const strong = fakeDetection(300, 300);
      // A second, distinguishable detection (shifted keypoints -> a
      // genuinely different alignment/crop) with a lower score.
      const weak = {
        ...strong,
        score: 0.55,
        keypoints: strong.keypoints.map((p) => ({ x: p.x + 15, y: p.y })),
      };
      const strongScored = { ...strong, score: 0.95 };

      detectFacesSpy.mockResolvedValueOnce([weak, strongScored]);
      const whenBothPresent = await generateFaceEmbedding(image);

      // Same image, but only the higher-scoring detection this time — if
      // the picking logic is correct, this must produce the exact same
      // embedding as above (proves *which* detection was actually used,
      // not just that multiple detections don't crash it).
      detectFacesSpy.mockResolvedValueOnce([strongScored]);
      const onlyStrong = await generateFaceEmbedding(image);

      expect(whenBothPresent.vector).toEqual(onlyStrong.vector);
    },
    MODEL_TEST_TIMEOUT,
  );
});
