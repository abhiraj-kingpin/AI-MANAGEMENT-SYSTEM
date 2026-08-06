import { generateFaceEmbedding } from '../../../src/modules/face-recognition/faceEmbedding.provider';

/**
 * This only verifies the placeholder's documented, honest properties
 * (deterministic, correctly-shaped, unit-normalized) — NOT that it does
 * real face recognition, which it explicitly does not. See
 * faceEmbedding.provider.ts's module doc comment.
 */
describe('generateFaceEmbedding (placeholder provider)', () => {
  it('is deterministic — the same bytes always produce the same vector', async () => {
    const image = Buffer.from('same-fake-image-bytes');

    const a = await generateFaceEmbedding(image);
    const b = await generateFaceEmbedding(image);

    expect(a.vector).toEqual(b.vector);
  });

  it('produces different vectors for different input bytes', async () => {
    const a = await generateFaceEmbedding(Buffer.from('image-one'));
    const b = await generateFaceEmbedding(Buffer.from('image-two'));

    expect(a.vector).not.toEqual(b.vector);
  });

  it('produces a 128-dimensional, roughly unit-normalized vector', async () => {
    const { vector } = await generateFaceEmbedding(Buffer.from('some-image-bytes'));

    expect(vector).toHaveLength(128);
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('returns a quality score in [0, 1]', async () => {
    const { qualityScore } = await generateFaceEmbedding(Buffer.from('some-image-bytes'));

    expect(qualityScore).toBeGreaterThanOrEqual(0);
    expect(qualityScore).toBeLessThanOrEqual(1);
  });
});
