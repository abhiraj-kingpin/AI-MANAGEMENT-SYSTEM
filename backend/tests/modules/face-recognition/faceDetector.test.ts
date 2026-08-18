/**
 * @jest-environment <rootDir>/tests/utils/realGlobalsNodeEnv.js
 */
import sharp from 'sharp';
import { detectFaces } from '../../../src/modules/face-recognition/faceDetector';

/**
 * These run the REAL faceDetector.ts end-to-end — real sharp preprocessing,
 * real ONNX inference against the actual `det_500m.onnx` file (see that
 * module's own doc comment for exactly what this is and isn't verified to
 * do). Same custom Jest environment as `faceEmbedding.provider.test.ts`,
 * for the same reason (see that file's comment) — a documented Jest+
 * onnxruntime-node realm limitation, not a bug in this project's code.
 *
 * What's genuinely verifiable here without real photos of real faces: a
 * flat, featureless synthetic image produces zero detections (there's
 * nothing face-like in it), the pipeline is deterministic, results are
 * shaped correctly, and different image sizes/aspect ratios don't crash
 * the resize/pad math. What's NOT verifiable: that a real face is actually
 * detected, or that the bounding box/landmarks would be accurate on one —
 * this environment has no photos of real people to test that against.
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
