import { AppError } from '../errors/AppError';

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw AppError.badRequest(
      'Embedding vectors must be the same length to compare.',
      'VECTOR_LENGTH_MISMATCH',
    );
  }
  if (a.length === 0) {
    throw AppError.badRequest('Embedding vectors must not be empty.', 'VECTOR_EMPTY');
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function maxCosineSimilarity(target: number[], candidates: number[][]): number {
  let best = 0;
  for (const candidate of candidates) {
    const score = cosineSimilarity(target, candidate);
    if (score > best) best = score;
  }
  return best;
}
