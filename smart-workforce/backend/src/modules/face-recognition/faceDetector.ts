import path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import type { Point2D } from './faceAlign';

const MODEL_PATH = path.join(__dirname, '..', '..', '..', 'models', 'det_500m.onnx');
const INPUT_SIZE = 640;
const INPUT_NAME = 'input.1';

const STRIDES = [8, 16, 32] as const;
const SCORE_OUTPUT_NAMES = ['443', '468', '493'];
const BBOX_OUTPUT_NAMES = ['446', '471', '496'];
const KPS_OUTPUT_NAMES = ['449', '474', '499'];
const NUM_ANCHORS_PER_LOCATION = 2;
const NUM_KEYPOINTS = 5;

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
  keypoints: Point2D[];
}

let sessionPromise: Promise<ort.InferenceSession> | null = null;
function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, {
    executionMode: 'sequential',
    intraOpNumThreads: 1,
    interOpNumThreads: 1,
  });
  return sessionPromise;
}

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

      const gridIndex = Math.floor(row / NUM_ANCHORS_PER_LOCATION);
      const gy = Math.floor(gridIndex / gridSize);
      const gx = gridIndex % gridSize;
      const cx = gx * stride;
      const cy = gy * stride;

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
