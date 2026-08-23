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
import { detectLiveness } from '../../../src/modules/face-recognition/livenessDetector';

const { detectFaces } = faceDetectorModule;

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

function fakeImage(
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

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
      const weak = {
        ...strong,
        score: 0.55,
        keypoints: strong.keypoints.map((p) => ({ x: p.x + 15, y: p.y })),
      };
      const strongScored = { ...strong, score: 0.95 };

      detectFacesSpy.mockResolvedValueOnce([weak, strongScored]);
      const whenBothPresent = await generateFaceEmbedding(image);

      detectFacesSpy.mockResolvedValueOnce([strongScored]);
      const onlyStrong = await generateFaceEmbedding(image);

      expect(whenBothPresent.vector).toEqual(onlyStrong.vector);
    },
    MODEL_TEST_TIMEOUT,
  );
});

describe('detectLiveness (real MiniFASNet-V2 anti-spoofing)', () => {
  function centeredBbox(width: number, height: number): FaceBoundingBox {
    const size = Math.min(width, height) * 0.6;
    const cx = width / 2;
    const cy = height / 2;
    return { x1: cx - size / 2, y1: cy - size / 2, x2: cx + size / 2, y2: cy + size / 2 };
  }

  it(
    'returns a valid 3-class softmax (each in [0,1], summing to ~1) and a consistent liveScore',
    async () => {
      const image = await flatImage(320, 240, { r: 140, g: 120, b: 100 });
      const result = await detectLiveness(image, centeredBbox(320, 240));

      const { live, printAttack, replayAttack } = result.scores;
      for (const p of [live, printAttack, replayAttack]) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
      expect(live + printAttack + replayAttack).toBeCloseTo(1, 5);
      expect(result.liveScore).toBeCloseTo(1 - (printAttack + replayAttack), 10);
      expect(result.isLive).toBe(result.liveScore >= 0.5);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'is deterministic — the same image and bbox always produce the same result',
    async () => {
      const image = await flatImage(300, 300, { r: 90, g: 110, b: 130 });
      const bbox = centeredBbox(300, 300);

      const a = await detectLiveness(image, bbox);
      const b = await detectLiveness(image, bbox);

      expect(a.scores).toEqual(b.scores);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'does not crash when the bounding box extends past the image edges (exercises _get_new_box clamping)',
    async () => {
      const image = await flatImage(200, 200, { r: 50, g: 60, b: 70 });
      const edgeBbox: FaceBoundingBox = { x1: -20, y1: -20, x2: 220, y2: 220 };

      await expect(detectLiveness(image, edgeBbox)).resolves.toBeDefined();
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'does not crash on a wide, non-square image',
    async () => {
      const image = await flatImage(800, 200, { r: 40, g: 40, b: 40 });
      await expect(detectLiveness(image, centeredBbox(800, 200))).resolves.toBeDefined();
    },
    MODEL_TEST_TIMEOUT,
  );
});
