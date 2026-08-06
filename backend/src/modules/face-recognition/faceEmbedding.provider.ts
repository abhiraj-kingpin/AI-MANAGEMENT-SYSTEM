import crypto from 'node:crypto';

const EMBEDDING_DIMENSIONS = 128;

export interface GeneratedEmbedding {
  vector: number[];
  qualityScore: number;
}

/**
 * ⚠️ PLACEHOLDER — does NOT perform real face detection or embedding.
 *
 * The rest of this module (storage, quality-based filtering, cosine-
 * similarity matching, confidence thresholding — see
 * shared/utils/vectorMath.ts and face.service.ts) is real, working logic.
 * This one function is the seam where actual ML inference plugs in: swap it
 * for a call to a Python microservice (facenet-pytorch/dlib) or a Node
 * TensorFlow.js binding loading a MobileFaceNet/FaceNet .tflite model.
 * Bundling a real model wasn't feasible in this backend-only dev
 * environment (no GPU, no model download/packaging), so this exists to keep
 * the surrounding pipeline fully exercisable end-to-end in the meantime —
 * see docs/architecture/06-tech-stack-justification.md for why the *real*
 * embedding generation is meant to run on-device (mobile, TFLite) for
 * attendance anyway; this stub only covers server-side registration.
 *
 * What it actually does: expands a SHA-256 digest of the image bytes into a
 * unit vector. Deterministic (the same image bytes always produce the same
 * vector, which is useful for tests), but semantically meaningless — two
 * different photos of the same person will NOT produce similar vectors,
 * which is the entire point a real model exists to solve.
 */
export async function generateFaceEmbedding(imageBuffer: Buffer): Promise<GeneratedEmbedding> {
  return {
    vector: expandToUnitVector(imageBuffer, EMBEDDING_DIMENSIONS),
    qualityScore: estimatePlaceholderQualityScore(imageBuffer),
  };
}

function expandToUnitVector(buffer: Buffer, dimensions: number): number[] {
  const bytes: number[] = [];
  let block = buffer;
  while (bytes.length < dimensions) {
    block = crypto.createHash('sha256').update(block).digest();
    for (const byte of block) {
      bytes.push(byte);
      if (bytes.length >= dimensions) break;
    }
  }

  // Map bytes (0-255) into roughly [-1, 1] and L2-normalize, matching the
  // shape a real embedding model would produce.
  const centered = bytes.map((b) => (b - 127.5) / 127.5);
  const norm = Math.sqrt(centered.reduce((sum, v) => sum + v * v, 0)) || 1;
  return centered.map((v) => v / norm);
}

/**
 * Placeholder quality heuristic, not real image analysis (which needs
 * blur/sharpness detection, brightness, face-size-in-frame). Keeps the
 * "discard low-quality registration photos" branch in face.service.ts
 * exercisable; has no relationship to actual photo quality.
 */
function estimatePlaceholderQualityScore(buffer: Buffer): number {
  const kb = buffer.byteLength / 1024;
  return Math.max(0, Math.min(1, kb / 200)); // saturates around ~200KB
}
