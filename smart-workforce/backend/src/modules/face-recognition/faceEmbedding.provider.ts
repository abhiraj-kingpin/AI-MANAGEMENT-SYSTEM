import path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { warpAlignedFace } from './faceAlign';
import { detectFaces, type FaceBoundingBox } from './faceDetector';

export interface GeneratedEmbedding {
  vector: number[];
  qualityScore: number;
  bbox: FaceBoundingBox;
}

export class NoFaceDetectedError extends Error {
  constructor() {
    super('No face was detected in this photo.');
    this.name = 'NoFaceDetectedError';
  }
}

const MODEL_PATH = path.join(__dirname, '..', '..', '..', 'models', 'w600k_mbf.onnx');
const INPUT_SIZE = 112;
const INPUT_NAME = 'input.1';
const OUTPUT_NAME = '516';

let sessionPromise: Promise<ort.InferenceSession> | null = null;
function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, {
    executionMode: 'sequential',
    intraOpNumThreads: 1,
    interOpNumThreads: 1,
  });
  return sessionPromise;
}

export async function generateFaceEmbedding(imageBuffer: Buffer): Promise<GeneratedEmbedding> {
  const detections = await detectFaces(imageBuffer);
  if (detections.length === 0) {
    throw new NoFaceDetectedError();
  }
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

  const aligned = warpAlignedFace(
    { data, width: info.width, height: info.height, channels: info.channels },
    keypoints,
    INPUT_SIZE,
  );

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

function estimatePlaceholderQualityScore(buffer: Buffer): number {
  const kb = buffer.byteLength / 1024;
  return Math.max(0, Math.min(1, kb / 200));
}
