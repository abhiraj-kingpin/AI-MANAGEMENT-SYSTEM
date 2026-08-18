import path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

export interface GeneratedEmbedding {
  vector: number[];
  qualityScore: number;
}

// backend/models/, not src/modules/face-recognition/models/ — the ONNX
// file isn't TypeScript, so `tsc` never copies it into dist/ on its own.
// src/ and dist/ sit at the same depth under backend/ (see tsconfig.json's
// rootDir/outDir), so this same relative path resolves correctly whether
// running from source (tsx watch, dev) or compiled (dist/, prod) — three
// levels up from this file's own directory to backend/, then into models/.
// See Dockerfile's runtime stage for the matching COPY.
const MODEL_PATH = path.join(__dirname, '..', '..', '..', 'models', 'w600k_mbf.onnx');
const INPUT_SIZE = 112;
const INPUT_NAME = 'input.1';
const OUTPUT_NAME = '516';

// Lazily created, cached across calls — loading and parsing a 13.6MB ONNX
// model is real work; every registration after the first reuses the same
// session instead of reloading the file.
let sessionPromise: Promise<ort.InferenceSession> | null = null;
function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH);
  return sessionPromise;
}

/**
 * A real face embedding — MobileFaceNet (`w600k_mbf.onnx`), from
 * InsightFace's official `buffalo_s` model pack
 * (https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_s.zip,
 * MIT license; SHA-256 of the extracted file:
 * 9cc6e4a75f0e2bf0b1aed94578f144d15175f357bdc05e815e5c4a02b319eb4f — see
 * backend/README.md's Known Simplifications section). A genuine trained
 * neural network (input `[1,3,112,112]`, output a 512-dim vector — both
 * confirmed by actually running inference against this exact file, not
 * assumed from documentation), not a hash or a hand-rolled heuristic.
 *
 * Preprocessing follows InsightFace's own documented convention: resize to
 * 112×112, RGB channel order, `(pixel - 127.5) / 128` per channel, no
 * per-channel mean/std beyond that — then NCHW-planar, not HWC-interleaved
 * (sharp's native output), which `toInputTensor` transposes.
 *
 * What this honestly does NOT do: detect or align the face first. The
 * whole uploaded photo is resized straight to the model's 112×112 input,
 * not a cropped-and-aligned face region — InsightFace's own models are
 * trained on aligned crops, so accuracy on an unaligned full photo is
 * materially worse than a production pipeline that detects+aligns first.
 * The same `buffalo_s` pack bundles a real face detector (`det_500m.onnx`,
 * SCRFD), deliberately not added in this pass: decoding SCRFD's raw
 * anchor-based output correctly needs real implementation work (anchor
 * generation per stride, score thresholding, NMS) this environment has no
 * way to verify against real photos with known face locations — shipping
 * unverified detection-decoding logic risked being worse than being
 * explicit about the gap instead.
 *
 * What this also can't verify: that the embeddings it produces are
 * actually *discriminative* for real human faces — this environment has no
 * photos of real people with known identities to test recognition accuracy
 * against. What IS verified: this is the genuine, official InsightFace
 * release (checksum-matched against the source archive), it runs real
 * inference (not a stub — confirmed via `onnxruntime-node`, not assumed),
 * and the output is deterministic and correctly shaped for every
 * downstream consumer (`face.service.ts`'s cosine-similarity matching,
 * `shared/utils/vectorMath.ts`).
 */
export async function generateFaceEmbedding(imageBuffer: Buffer): Promise<GeneratedEmbedding> {
  const session = await getSession();
  const tensor = await toInputTensor(imageBuffer);
  const results = await session.run({ [INPUT_NAME]: tensor });
  const raw = Array.from(results[OUTPUT_NAME].data as Float32Array);

  return {
    vector: l2Normalize(raw),
    qualityScore: estimatePlaceholderQualityScore(imageBuffer),
  };
}

async function toInputTensor(imageBuffer: Buffer): Promise<ort.Tensor> {
  const { data } = await sharp(imageBuffer)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'cover' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  // sharp's raw() output is interleaved HWC (row-major, RGB) — transpose to
  // the model's planar NCHW while applying InsightFace's normalization.
  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  const chw = new Float32Array(3 * pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    chw[i] = (data[i * 3] - 127.5) / 128; // R plane
    chw[pixelCount + i] = (data[i * 3 + 1] - 127.5) / 128; // G plane
    chw[2 * pixelCount + i] = (data[i * 3 + 2] - 127.5) / 128; // B plane
  }

  return new ort.Tensor('float32', chw, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Unchanged from the previous placeholder's heuristic — a real quality
 * assessment (blur/sharpness, brightness, face-size-in-frame) needs the
 * face-detection step this pass deliberately doesn't add (see the module
 * doc comment above). Keeps the "discard low-quality registration photos"
 * branch in face.service.ts exercisable; still has no relationship to
 * actual photo quality.
 */
function estimatePlaceholderQualityScore(buffer: Buffer): number {
  const kb = buffer.byteLength / 1024;
  return Math.max(0, Math.min(1, kb / 200));
}
