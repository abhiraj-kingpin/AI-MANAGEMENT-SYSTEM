import { cosineSimilarity, maxCosineSimilarity } from '../../src/shared/utils/vectorMath';

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('is -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1);
  });

  it('is scale-invariant (only direction matters)', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });

  it('returns 0 for a zero vector rather than dividing by zero', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it('rejects mismatched vector lengths', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
      expect.objectContaining({ code: 'VECTOR_LENGTH_MISMATCH' }),
    );
  });

  it('rejects empty vectors', () => {
    expect(() => cosineSimilarity([], [])).toThrow(
      expect.objectContaining({ code: 'VECTOR_EMPTY' }),
    );
  });
});

describe('maxCosineSimilarity', () => {
  it('returns the highest similarity among several candidates', () => {
    const target = [1, 0, 0];
    const candidates = [
      [0, 1, 0], // orthogonal -> 0
      [1, 0, 0], // identical -> 1
      [0.7, 0.7, 0], // partial match
    ];
    expect(maxCosineSimilarity(target, candidates)).toBeCloseTo(1);
  });

  it('returns 0 for an empty candidate set', () => {
    expect(maxCosineSimilarity([1, 2, 3], [])).toBe(0);
  });
});
