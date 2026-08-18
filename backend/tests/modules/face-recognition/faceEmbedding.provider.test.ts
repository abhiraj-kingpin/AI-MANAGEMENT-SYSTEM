/**
 * @jest-environment <rootDir>/tests/utils/realGlobalsNodeEnv.js
 */
import sharp from 'sharp';
import { generateFaceEmbedding } from '../../../src/modules/face-recognition/faceEmbedding.provider';

/**
 * These run the REAL faceEmbedding.provider.ts end-to-end — real sharp
 * preprocessing, real ONNX inference against the actual `w600k_mbf.onnx`
 * file (see that module's own doc comment for exactly what this is and
 * isn't verified to do). The one place in this suite that intentionally
 * isn't mocked, mirroring `GeometricEmbeddingGenerator`'s own real
 * (unmocked) test on the mobile side — face.service.test.ts mocks this
 * module entirely for everything that doesn't need to exercise it for
 * real.
 *
 * Fixtures are tiny synthetic flat-color images generated with `sharp`
 * itself at test time, not checked-in binary files or arbitrary garbage
 * bytes — unlike the old byte-hashing placeholder, this provider actually
 * decodes the image, so it needs real (if trivial) image data.
 */
function fakeImage(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer();
}

// Generous timeout — the first test in this file pays the cost of loading
// the 13.6MB ONNX model (cached at module level after that, so every test
// after the first is fast).
const MODEL_TEST_TIMEOUT = 20_000;

describe('generateFaceEmbedding (real MobileFaceNet provider)', () => {
  it(
    'is deterministic — the same image bytes always produce the same vector',
    async () => {
      const image = await fakeImage({ r: 120, g: 100, b: 90 });

      const a = await generateFaceEmbedding(image);
      const b = await generateFaceEmbedding(image);

      expect(a.vector).toEqual(b.vector);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'produces different vectors for visibly different images',
    async () => {
      const a = await generateFaceEmbedding(await fakeImage({ r: 10, g: 10, b: 10 }));
      const b = await generateFaceEmbedding(await fakeImage({ r: 240, g: 200, b: 180 }));

      expect(a.vector).not.toEqual(b.vector);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'produces a 512-dimensional, unit-normalized vector',
    async () => {
      const { vector } = await generateFaceEmbedding(await fakeImage({ r: 128, g: 128, b: 128 }));

      expect(vector).toHaveLength(512);
      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1, 5);
    },
    MODEL_TEST_TIMEOUT,
  );

  it(
    'returns a quality score in [0, 1]',
    async () => {
      const { qualityScore } = await generateFaceEmbedding(
        await fakeImage({ r: 50, g: 60, b: 70 }),
      );

      expect(qualityScore).toBeGreaterThanOrEqual(0);
      expect(qualityScore).toBeLessThanOrEqual(1);
    },
    MODEL_TEST_TIMEOUT,
  );
});
