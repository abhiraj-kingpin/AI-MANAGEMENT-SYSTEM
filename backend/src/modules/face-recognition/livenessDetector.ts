import path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { bilinearSample, type RawImage } from './faceAlign';
import type { FaceBoundingBox } from './faceDetector';

// backend/models/, not src/modules/face-recognition/models/ — see
// faceEmbedding.provider.ts's MODEL_PATH comment for why (same reasoning,
// same file, same Dockerfile COPY).
const MODEL_PATH = path.join(__dirname, '..', '..', '..', 'models', 'minifasnet_v2.onnx');
const INPUT_SIZE = 80;
const INPUT_NAME = 'input';
const OUTPUT_NAME = 'output';
// Matches the upstream model's own filename prefix, "2.7_80x80_MiniFASNetV2"
// — the crop margin it was trained with, not an arbitrary choice.
const CROP_SCALE = 2.7;

export interface LivenessResult {
  isLive: boolean;
  /** `1 - (printAttack + replayAttack)`, in [0, 1] — the single number `LIVE_THRESHOLD` is compared against. */
  liveScore: number;
  /** The raw 3-class softmax, for anyone who wants more than the collapsed live/not-live decision. */
  scores: { live: number; printAttack: number; replayAttack: number };
}

// No labeled real-vs-spoof dataset exists in this environment (LFW, used
// for FACE_MATCH_THRESHOLD's own calibration in scripts/lfw-eval.ts, is
// entirely genuine photos — it has no print/replay-attack examples to
// measure a liveness threshold against). 0.5 is the natural "which class
// wins" cut for a 3-class softmax collapsed to live-vs-not — a real
// default, not a copy of another threshold, but still unverified the way
// FACE_MATCH_THRESHOLD used to be. Documented here rather than left silent.
const LIVE_THRESHOLD = 0.5;

// Explicit single-threaded, sequential SessionOptions — same reasoning as
// faceDetector.ts/faceEmbedding.provider.ts's own getSession() (see
// either's comment): onnxruntime-node has open upstream reports of
// non-deterministic native crashes tied to its own thread pool during
// session init on Linux.
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
 * Real single-image presentation-attack detection (PAD) — MiniFASNet-V2
 * (`minifasnet_v2.onnx`), an ONNX export of InsightFace-adjacent project
 * minivision-ai's `Silent-Face-Anti-Spoofing` (Apache 2.0). Given a photo
 * and a face's bounding box in it (from `detectFaces`), returns whether
 * the face looks like a live person versus a printed photo or a
 * screen/video replay — a different, complementary signal from the
 * mobile app's blink-based liveness check (`BlinkLivenessChecker`):
 * that one is temporal (requires a real eye-open→closed→open sequence
 * across several frames) and catches a *static* photo trivially, but
 * could in principle be fooled by a video replay that itself shows
 * blinking; this one is single-image texture/reflection/moire analysis
 * that doesn't care about motion at all. Neither replaces the other.
 *
 * Model provenance verified before use, not assumed: downloaded from
 * `garciafido/minifasnet-v2-anti-spoofing-onnx` on Hugging Face (SHA-256
 * `d7b3cd9ba8a7ceb13baa8c4720902e27ca3112eff52f926c08804af6b6eecc7b`,
 * matches this repo's own committed file), whose model card documents the
 * exact conversion (torch 2.2.2 -> ONNX opset 11) from the upstream
 * `2.7_80x80_MiniFASNetV2.pth` weights (SHA-256
 * `a5eb02e1843f19b5386b953cc4c9f011c3f985d0ee2bb9819eea9a142099bec0`,
 * bit-equivalent, format-only conversion) and cites
 * `minivision-ai/Silent-Face-Anti-Spoofing`'s own `LICENSE` and
 * `MiniFASNet.py` architecture. The real input/output contract (input
 * `[batch,3,80,80]` float32, output `[1,3]` logits) was independently
 * confirmed by actually running inference against this exact file, not
 * assumed from the model card alone.
 *
 * Preprocessing mirrors the upstream `CropImage._get_new_box`/`crop`
 * (`src/generate_patches.py`) exactly — fetched and read from that file
 * before writing `getCropBox` below, not derived from memory, the same
 * discipline `faceDetector.ts`'s anchor decoding and `faceAlign.ts`'s
 * reference template followed. One deliberate, documented approximation:
 * the upstream crop is resized to 80x80 via `cv2.resize`'s default
 * `INTER_LINEAR`, which this reproduces with a from-scratch bilinear
 * resize (reusing `faceAlign.ts`'s already-tested `bilinearSample`) using
 * the standard "half-pixel-center" coordinate mapping
 * (`src = (dst + 0.5) * scale - 0.5`) that OpenCV's own documentation
 * describes for INTER_LINEAR — not verified byte-for-byte against a real
 * `cv2.resize` call, since this environment has no OpenCV/Python to cross-
 * check against, same class of gap `faceAlign.ts`'s own warp had before
 * committing to its own from-scratch implementation.
 */
export async function detectLiveness(
  imageBuffer: Buffer,
  bbox: FaceBoundingBox,
): Promise<LivenessResult> {
  const session = await getSession();
  const tensor = await toCroppedInputTensor(imageBuffer, bbox);
  const results = await session.run({ [INPUT_NAME]: tensor });
  const logits = Array.from(results[OUTPUT_NAME].data as Float32Array);
  const [live, printAttack, replayAttack] = softmax(logits);
  const liveScore = 1 - (printAttack + replayAttack);

  return {
    isLive: liveScore >= LIVE_THRESHOLD,
    liveScore,
    scores: { live, printAttack, replayAttack },
  };
}

interface CropBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * A direct port of `CropImage._get_new_box` from minivision-ai's own
 * `src/generate_patches.py` — same variable-for-variable structure, not a
 * reformulation, specifically so this stays checkable line-by-line against
 * the original rather than trusting an independently-derived equivalent.
 * Upstream's `bbox` is `[x, y, w, h]`; `faceDetector.ts`'s `FaceBoundingBox`
 * is `{x1,y1,x2,y2}, so the width/height are computed here at the call site.
 */
function getCropBox(
  srcW: number,
  srcH: number,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
): CropBox {
  const scale = Math.min((srcH - 1) / boxH, Math.min((srcW - 1) / boxW, CROP_SCALE));
  const newWidth = boxW * scale;
  const newHeight = boxH * scale;
  const centerX = boxW / 2 + x;
  const centerY = boxH / 2 + y;

  let left = centerX - newWidth / 2;
  let top = centerY - newHeight / 2;
  let right = centerX + newWidth / 2;
  let bottom = centerY + newHeight / 2;

  if (left < 0) {
    right -= left;
    left = 0;
  }
  if (top < 0) {
    bottom -= top;
    top = 0;
  }
  if (right > srcW - 1) {
    left -= right - srcW + 1;
    right = srcW - 1;
  }
  if (bottom > srcH - 1) {
    top -= bottom - srcH + 1;
    bottom = srcH - 1;
  }

  // Python's int() truncates toward zero — equivalent to Math.trunc here
  // since every coordinate is already clamped non-negative above.
  return {
    left: Math.trunc(left),
    top: Math.trunc(top),
    right: Math.trunc(right),
    bottom: Math.trunc(bottom),
  };
}

async function toCroppedInputTensor(
  imageBuffer: Buffer,
  bbox: FaceBoundingBox,
): Promise<ort.Tensor> {
  const { data, info } = await sharp(imageBuffer)
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const source: RawImage = {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  };

  const box = getCropBox(
    info.width,
    info.height,
    bbox.x1,
    bbox.y1,
    bbox.x2 - bbox.x1,
    bbox.y2 - bbox.y1,
  );
  // Upstream's org_img[top:bottom+1, left:right+1] — both ends inclusive.
  const cropWidth = box.right - box.left + 1;
  const cropHeight = box.bottom - box.top + 1;

  // Planar BGR (not RGB — MiniFASNet's documented input order), normalized
  // to [0,1] by /255 (not the (pixel-127.5)/128 convention the embedding
  // and detector models use — a different model, a different, equally
  // real, documented normalization).
  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  const chw = new Float32Array(3 * pixelCount);
  for (let oy = 0; oy < INPUT_SIZE; oy++) {
    for (let ox = 0; ox < INPUT_SIZE; ox++) {
      // Half-pixel-center resize mapping — see this module's doc comment.
      const sx = box.left + ((ox + 0.5) * cropWidth) / INPUT_SIZE - 0.5;
      const sy = box.top + ((oy + 0.5) * cropHeight) / INPUT_SIZE - 0.5;
      const [r, g, b] = bilinearSample(source, sx, sy);
      const i = oy * INPUT_SIZE + ox;
      chw[i] = b / 255;
      chw[pixelCount + i] = g / 255;
      chw[2 * pixelCount + i] = r / 255;
    }
  }

  return new ort.Tensor('float32', chw, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}
