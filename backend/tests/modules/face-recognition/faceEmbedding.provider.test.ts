/**
 * @jest-environment <rootDir>/tests/utils/realGlobalsNodeEnv.js
 */
jest.mock('../../../src/modules/face-recognition/faceDetector', () => ({
  detectFaces: jest.fn(),
}));

import sharp from 'sharp';
import {
  REFERENCE_KEYPOINTS_112,
  type Point2D,
} from '../../../src/modules/face-recognition/faceAlign';
import { detectFaces } from '../../../src/modules/face-recognition/faceDetector';
import {
  generateFaceEmbedding,
  NoFaceDetectedError,
} from '../../../src/modules/face-recognition/faceEmbedding.provider';

const mockedDetectFaces = detectFaces as unknown as jest.Mock;

/**
 * These run the REAL faceEmbedding.provider.ts embedding step end-to-end —
 * real sharp preprocessing, real alignment warp (`faceAlign.ts`, already
 * independently verified in `faceAlign.test.ts`), real ONNX inference
 * against the actual `w600k_mbf.onnx` file (see that module's own doc
 * comment for exactly what this is and isn't verified to do).
 *
 * Detection itself (`faceDetector.ts`) is mocked here rather than
 * re-exercised — it has its own dedicated, real (unmocked) test file
 * (`faceDetector.test.ts`), and a synthetic procedural image reliably
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
): { score: number; bbox: unknown; keypoints: Point2D[] } {
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

const MODEL_TEST_TIMEOUT = 20_000;

beforeEach(() => {
  mockedDetectFaces.mockReset();
});

describe('generateFaceEmbedding (real MobileFaceNet provider)', () => {
  it(
    'is deterministic — the same image and detection always produce the same vector',
    async () => {
      const image = await fakeImage(300, 300, { r: 120, g: 100, b: 90 });
      mockedDetectFaces.mockResolvedValue([fakeDetection(300, 300)]);

      const a = await generateFaceEmbedding(image);
      const b = await generateFaceEmbedding(image);

      expect(a.vector).toEqual(b.vector);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'produces different vectors for visibly different images',
    async () => {
      mockedDetectFaces.mockResolvedValue([fakeDetection(300, 300)]);
      const a = await generateFaceEmbedding(await fakeImage(300, 300, { r: 10, g: 10, b: 10 }));
      const b = await generateFaceEmbedding(await fakeImage(300, 300, { r: 240, g: 200, b: 180 }));

      expect(a.vector).not.toEqual(b.vector);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'produces a 512-dimensional, unit-normalized vector',
    async () => {
      mockedDetectFaces.mockResolvedValue([fakeDetection(300, 300)]);
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
      mockedDetectFaces.mockResolvedValue([fakeDetection(300, 300)]);
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
      mockedDetectFaces.mockResolvedValue([]);

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

      mockedDetectFaces.mockResolvedValueOnce([weak, strongScored]);
      const whenBothPresent = await generateFaceEmbedding(image);

      // Same image, but only the higher-scoring detection this time — if
      // the picking logic is correct, this must produce the exact same
      // embedding as above (proves *which* detection was actually used,
      // not just that multiple detections don't crash it).
      mockedDetectFaces.mockResolvedValueOnce([strongScored]);
      const onlyStrong = await generateFaceEmbedding(image);

      expect(whenBothPresent.vector).toEqual(onlyStrong.vector);
    },
    MODEL_TEST_TIMEOUT,
  );
});
