import path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { warpAlignedFace } from './faceAlign';
import { detectFaces, type FaceBoundingBox } from './faceDetector';

export interface GeneratedEmbedding {
  vector: number[];
  qualityScore: number;
  /** The detected face actually used (the highest-scoring one, if more than one was found) — exposed so a caller can run a second real pass (e.g. `livenessDetector.ts`) against the exact same detection without re-running `detectFaces` itself. */
  bbox: FaceBoundingBox;
}

/** Thrown when `faceDetector.ts` finds no face at all in the photo — `face.service.ts#register()` catches this and discards the photo, the same as a low quality score, rather than letting it crash the whole registration request. */
export class NoFaceDetectedError extends Error {
  constructor() {
    super('No face was detected in this photo.');
    this.name = 'NoFaceDetectedError';
  }
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
//
// Explicit single-threaded, sequential SessionOptions: CI's Linux runner
// was hard-aborting (SIGABRT) inside onnxruntime-node's own native init
// path the moment either this or faceDetector.ts's session was first
// created — 608/608 tests passed locally throughout, on both Node 20 and
// 22, so it wasn't a Node-version issue. onnxruntime-node has multiple
// open upstream reports of non-deterministic native crashes tied to its
// internal thread pool during session init on Linux (e.g.
// microsoft/onnxruntime#23794, #20084) — this is the standard mitigation
// for that class of bug: don't let it size/manage its own thread pool at
// all. These are small CPU models on a request path that's already
// nowhere near latency-sensitive enough to need ORT's own parallelism.
let sessionPromise: Promise<ort.InferenceSession> | null = null;
function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, {
    executionMode: 'sequential',
    intraOpNumThreads: 1,
    interOpNumThreads: 1,
  });
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
 * The photo is now genuinely detected-and-aligned first, not just resized
 * whole: `detectFaces` (SCRFD, `faceDetector.ts`) finds the face and its 5
 * landmarks, `warpAlignedFace` (`faceAlign.ts`) warps them onto
 * InsightFace's standard reference template — the same alignment
 * MobileFaceNet was actually trained on, closing the gap this module used
 * to carry ("the whole photo is resized straight to the model's input, not
 * a cropped-and-aligned face region"). Manually verified against a real
 * (CC0-licensed, not committed to this repo) photo before shipping: a
 * single correctly-positioned detection, anatomically plausible landmarks
 * (eyes level, nose between and below them, mouth corners below that) —
 * not just "runs without crashing."
 *
 * Whether the embeddings it produces are actually *discriminative* for
 * real human faces is no longer unverifiable, as of `v1.1.9`:
 * `scripts/lfw-eval.ts` runs this exact function against LFW's standard
 * `pairsDevTest.txt` verification split and found real separation (989
 * processed pairs, mean same-person similarity 0.588 vs. mean
 * different-person similarity 0.003, 96.97% accuracy at the empirically
 * best threshold) — see that script's own doc comment and the `v1.1.9`
 * CHANGELOG entry for the full numbers, including the real, previously-
 * undiscovered problem it caught (`FACE_MATCH_THRESHOLD`'s old default
 * scored only 51.16%, essentially chance). What's still NOT verified:
 * this specific deployment's own employees under this specific
 * deployment's actual camera conditions — LFW is a real but imperfect
 * proxy (mostly well-lit, front-facing public-figure photos). What else
 * IS independently verified regardless: this is the genuine, official
 * InsightFace release (checksum-matched), every stage (detection,
 * alignment, embedding) runs real inference/real geometry (not stubs), and
 * the output is deterministic and correctly shaped for every downstream
 * consumer (`face.service.ts`'s cosine-similarity matching).
 */
export async function generateFaceEmbedding(imageBuffer: Buffer): Promise<GeneratedEmbedding> {
  const detections = await detectFaces(imageBuffer);
  if (detections.length === 0) {
    throw new NoFaceDetectedError();
  }
  // Highest-confidence detection — a registration photo is expected to
  // contain exactly one clear face; if more than one face appears (someone
  // else walks through frame, a poster in the background), the most
  // confident detection is assumed to be the intended subject rather than
  // rejecting the whole photo.
  const best = detections.reduce((a, b) => (b.score > a.score ? b : a));

  const session = await getSession();
  const tensor = await toAlignedInputTensor(imageBuffer, best.keypoints);
  const results = await session.run({ [INPUT_NAME]: tensor });
  const raw = Array.from(results[OUTPUT_NAME].data as Float32Array);

  return {
    vector: l2Normalize(raw),
    qualityScore: estimatePlaceholderQualityScore(imageBuffer),
    bbox: best.bbox,
  };
}

async function toAlignedInputTensor(
  imageBuffer: Buffer,
  keypoints: Parameters<typeof warpAlignedFace>[1],
): Promise<ort.Tensor> {
  const { data, info } = await sharp(imageBuffer)
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 112×112×3 RGB, already aligned — see faceAlign.ts.
  const aligned = warpAlignedFace(
    { data, width: info.width, height: info.height, channels: info.channels },
    keypoints,
    INPUT_SIZE,
  );

  // Planar NCHW, InsightFace's documented (pixel-127.5)/128 normalization
  // — same convention faceDetector.ts's own preprocessing uses.
  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  const chw = new Float32Array(3 * pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    chw[i] = (aligned[i * 3] - 127.5) / 128;
    chw[pixelCount + i] = (aligned[i * 3 + 1] - 127.5) / 128;
    chw[2 * pixelCount + i] = (aligned[i * 3 + 2] - 127.5) / 128;
  }

  return new ort.Tensor('float32', chw, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Unchanged from the previous placeholder's heuristic — a real quality
 * assessment (blur/sharpness, brightness) beyond "is a face even in this
 * photo" (which is now real, via `detectFaces`) hasn't been added. Keeps
 * the "discard low-quality registration photos" branch in face.service.ts
 * exercisable; still has no relationship to actual photo quality.
 */
function estimatePlaceholderQualityScore(buffer: Buffer): number {
  const kb = buffer.byteLength / 1024;
  return Math.max(0, Math.min(1, kb / 200));
}
