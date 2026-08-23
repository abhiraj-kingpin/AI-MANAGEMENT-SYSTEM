import path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { bilinearSample, type RawImage } from './faceAlign';
import type { FaceBoundingBox } from './faceDetector';

const MODEL_PATH = path.join(__dirname, '..', '..', '..', 'models', 'minifasnet_v2.onnx');
const INPUT_SIZE = 80;
const INPUT_NAME = 'input';
const OUTPUT_NAME = 'output';
const CROP_SCALE = 2.7;

export interface LivenessResult {
  isLive: boolean;
  liveScore: number;
  scores: { live: number; printAttack: number; replayAttack: number };
}

const LIVE_THRESHOLD = 0.5;

let sessionPromise: Promise<ort.InferenceSession> | null = null;
function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, {
    executionMode: 'sequential',
    intraOpNumThreads: 1,
    interOpNumThreads: 1,
  });
  return sessionPromise;
}

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
  const cropWidth = box.right - box.left + 1;
  const cropHeight = box.bottom - box.top + 1;

  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  const chw = new Float32Array(3 * pixelCount);
  for (let oy = 0; oy < INPUT_SIZE; oy++) {
    for (let ox = 0; ox < INPUT_SIZE; ox++) {
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
