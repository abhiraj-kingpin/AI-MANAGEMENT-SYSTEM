import path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import type { Point2D } from './faceAlign';

// backend/models/, not src/modules/face-recognition/models/ — see
// faceEmbedding.provider.ts's MODEL_PATH comment for why (same reasoning,
// same file, same Dockerfile COPY).
const MODEL_PATH = path.join(__dirname, '..', '..', '..', 'models', 'det_500m.onnx');
const INPUT_SIZE = 640;
const INPUT_NAME = 'input.1';

// Verified by actually running inference against det_500m.onnx and reading
// back the real output names/shapes — not assumed from documentation. 9
// outputs matches InsightFace's own scrfd.py's len(outputs)==9 branch:
// fmc=3, strides [8,16,32], 2 anchors/location, keypoints enabled. Output
// order (stride index i uses outputs[i]/[i+fmc]/[i+fmc*2] for
// score/bbox/kps) was confirmed two ways: it matches scrfd.py's own
// indexing formula, AND each output's actual shape matches exactly the
// anchor count that stride/grid-size combination predicts (e.g. stride 8:
// 80×80 grid × 2 anchors = 12800 rows).
const STRIDES = [8, 16, 32] as const;
const SCORE_OUTPUT_NAMES = ['443', '468', '493'];
const BBOX_OUTPUT_NAMES = ['446', '471', '496'];
const KPS_OUTPUT_NAMES = ['449', '474', '499'];
const NUM_ANCHORS_PER_LOCATION = 2;
const NUM_KEYPOINTS = 5;

// InsightFace's own scrfd.py defaults.
const DET_THRESHOLD = 0.5;
const NMS_IOU_THRESHOLD = 0.4;

export interface FaceBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  score: number;
  bbox: FaceBoundingBox;
  /** [left eye, right eye, nose tip, left mouth corner, right mouth corner] — InsightFace's standard 5-point order, matching faceAlign.ts's REFERENCE_KEYPOINTS_112. */
  keypoints: Point2D[];
}

let sessionPromise: Promise<ort.InferenceSession> | null = null;
function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH);
  return sessionPromise;
}

/**
 * Real face detection — SCRFD (`det_500m.onnx`), from the same official
 * InsightFace `buffalo_s` pack `faceEmbedding.provider.ts`'s embedding
 * model comes from (see that file's doc comment for full provenance/
 * license/checksum — both files share it). Detects every face-like region
 * in a photo with a confidence score, bounding box, and 5 facial
 * landmarks — the landmarks are what `faceAlign.ts` uses to produce a
 * properly aligned 112×112 crop for the embedding model, not a naive
 * bounding-box crop.
 *
 * Anchor generation, bbox/keypoint decoding, and the score/NMS thresholds
 * all mirror InsightFace's own `scrfd.py` implementation exactly (the
 * `distance2bbox`/`distance2kps` formulas, the `mgrid`-based anchor-center
 * layout and its ×2 duplication for `num_anchors`, the stride-then-fmc
 * output indexing, the `(pixel-127.5)/128` RGB normalization shared with
 * the embedding model) — verified against that file's actual source, not
 * derived independently.
 */
export async function detectFaces(imageBuffer: Buffer): Promise<Detection[]> {
  const session = await getSession();
  const { tensor, detScale } = await toInputTensor(imageBuffer);
  const results = await session.run({ [INPUT_NAME]: tensor });

  const candidates: Detection[] = [];

  for (let strideIdx = 0; strideIdx < STRIDES.length; strideIdx++) {
    const stride = STRIDES[strideIdx];
    const gridSize = INPUT_SIZE / stride;

    const scores = results[SCORE_OUTPUT_NAMES[strideIdx]].data as Float32Array;
    const bboxPreds = results[BBOX_OUTPUT_NAMES[strideIdx]].data as Float32Array;
    const kpsPreds = results[KPS_OUTPUT_NAMES[strideIdx]].data as Float32Array;

    for (let row = 0; row < scores.length; row++) {
      const score = scores[row];
      if (score < DET_THRESHOLD) continue;

      // Consecutive pairs of rows (num_anchors=2) share the same grid
      // location/anchor center — scrfd.py's
      // `np.stack([anchor_centers]*num_anchors, axis=1).reshape((-1,2))`.
      const gridIndex = Math.floor(row / NUM_ANCHORS_PER_LOCATION);
      const gy = Math.floor(gridIndex / gridSize);
      const gx = gridIndex % gridSize;
      const cx = gx * stride;
      const cy = gy * stride;

      // bbox_preds/kps_preds are pre-multiplied by `stride` in
      // scrfd.py's forward() before distance2bbox/distance2kps ever see
      // them — replicated here rather than folded into the anchor math,
      // to keep this line-for-line checkable against that source.
      const dLeft = bboxPreds[row * 4] * stride;
      const dTop = bboxPreds[row * 4 + 1] * stride;
      const dRight = bboxPreds[row * 4 + 2] * stride;
      const dBottom = bboxPreds[row * 4 + 3] * stride;

      const bbox: FaceBoundingBox = {
        x1: (cx - dLeft) / detScale,
        y1: (cy - dTop) / detScale,
        x2: (cx + dRight) / detScale,
        y2: (cy + dBottom) / detScale,
      };

      const keypoints: Point2D[] = [];
      for (let k = 0; k < NUM_KEYPOINTS; k++) {
        const dx = kpsPreds[row * NUM_KEYPOINTS * 2 + k * 2] * stride;
        const dy = kpsPreds[row * NUM_KEYPOINTS * 2 + k * 2 + 1] * stride;
        keypoints.push({ x: (cx + dx) / detScale, y: (cy + dy) / detScale });
      }

      candidates.push({ score, bbox, keypoints });
    }
  }

  return nonMaxSuppression(candidates, NMS_IOU_THRESHOLD);
}

async function toInputTensor(
  imageBuffer: Buffer,
): Promise<{ tensor: ort.Tensor; detScale: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  const origWidth = metadata.width ?? 0;
  const origHeight = metadata.height ?? 0;
  if (!origWidth || !origHeight) {
    throw new Error('detectFaces: could not read image dimensions.');
  }

  // Resize preserving aspect ratio so the image fits entirely within the
  // model's square input, then place it at the top-left of a zero-padded
  // canvas — mirrors scrfd.py's own ratio-preserving resize +
  // `det_img[:new_height, :new_width, :] = resized_img` padding exactly
  // (for a square model input, its im_ratio/model_ratio branch reduces to
  // this single min() — same result, fewer branches).
  const detScale = Math.min(INPUT_SIZE / origWidth, INPUT_SIZE / origHeight);
  const newWidth = Math.max(1, Math.round(origWidth * detScale));
  const newHeight = Math.max(1, Math.round(origHeight * detScale));

  const { data: resizedData } = await sharp(imageBuffer)
    .resize(newWidth, newHeight, { fit: 'fill' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  // Padding must be *normalized* black, not a raw 0 — (0-127.5)/128, not 0
  // — since every real pixel in this tensor goes through that same
  // normalization. Filling with literal 0 here would silently feed the
  // model mid-gray padding instead of black.
  const blackNormalized = (0 - 127.5) / 128;
  const chw = new Float32Array(3 * pixelCount).fill(blackNormalized);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcIdx = (y * newWidth + x) * 3;
      const dstIdx = y * INPUT_SIZE + x;
      chw[dstIdx] = (resizedData[srcIdx] - 127.5) / 128;
      chw[pixelCount + dstIdx] = (resizedData[srcIdx + 1] - 127.5) / 128;
      chw[2 * pixelCount + dstIdx] = (resizedData[srcIdx + 2] - 127.5) / 128;
    }
  }

  return {
    tensor: new ort.Tensor('float32', chw, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    detScale,
  };
}

function nonMaxSuppression(detections: Detection[], iouThreshold: number): Detection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];

  for (const candidate of sorted) {
    if (kept.every((k) => iou(k.bbox, candidate.bbox) <= iouThreshold)) {
      kept.push(candidate);
    }
  }

  return kept;
}

function iou(a: FaceBoundingBox, b: FaceBoundingBox): number {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);

  const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  const unionArea = areaA + areaB - interArea;

  return unionArea <= 0 ? 0 : interArea / unionArea;
}
