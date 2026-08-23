
import fs from 'node:fs';
import path from 'node:path';
import {
  generateFaceEmbedding,
  NoFaceDetectedError,
} from '../src/modules/face-recognition/faceEmbedding.provider';
import { cosineSimilarity } from '../src/shared/utils/vectorMath';

const CURRENT_THRESHOLD = 0.85;

interface Pair {
  isMatch: boolean;
  imageA: string;
  imageB: string;
}

function lfwImagePath(lfwDir: string, name: string, imgNum: string): string {
  const padded = imgNum.padStart(4, '0');
  return path.join(lfwDir, name, `${name}_${padded}.jpg`);
}

function parsePairsFile(pairsPath: string, lfwDir: string): Pair[] {
  const lines = fs.readFileSync(pairsPath, 'utf-8').trim().split('\n');
  const pairs: Pair[] = [];
  for (const line of lines.slice(1)) {
    const parts = line.split('\t');
    if (parts.length === 3) {
      const [name, i1, i2] = parts;
      pairs.push({
        isMatch: true,
        imageA: lfwImagePath(lfwDir, name, i1),
        imageB: lfwImagePath(lfwDir, name, i2),
      });
    } else if (parts.length === 4) {
      const [name1, i1, name2, i2] = parts;
      pairs.push({
        isMatch: false,
        imageA: lfwImagePath(lfwDir, name1, i1),
        imageB: lfwImagePath(lfwDir, name2, i2),
      });
    }
  }
  return pairs;
}

async function embeddingFor(
  imagePath: string,
  cache: Map<string, number[] | null>,
): Promise<number[] | null> {
  const cached = cache.get(imagePath);
  if (cached !== undefined) return cached;
  try {
    const buffer = fs.readFileSync(imagePath);
    const { vector } = await generateFaceEmbedding(buffer);
    cache.set(imagePath, vector);
    return vector;
  } catch (err) {
    if (err instanceof NoFaceDetectedError) {
      cache.set(imagePath, null);
      return null;
    }
    throw err;
  }
}

function accuracyAt(
  results: { isMatch: boolean; similarity: number }[],
  threshold: number,
): number {
  let correct = 0;
  for (const r of results) {
    if (r.similarity >= threshold === r.isMatch) correct++;
  }
  return correct / results.length;
}

function tarAtFar(
  results: { isMatch: boolean; similarity: number }[],
  targetFar: number,
): { threshold: number; tar: number; far: number } {
  const negatives = results.filter((r) => !r.isMatch);
  const positives = results.filter((r) => r.isMatch);
  const candidateThresholds = [...new Set(results.map((r) => r.similarity))].sort((a, b) => a - b);

  let best = { threshold: 1, tar: 0, far: 0 };
  for (const t of candidateThresholds) {
    const falseAccepts = negatives.filter((r) => r.similarity >= t).length;
    const far = negatives.length === 0 ? 0 : falseAccepts / negatives.length;
    if (far <= targetFar) {
      const trueAccepts = positives.filter((r) => r.similarity >= t).length;
      const tar = positives.length === 0 ? 0 : trueAccepts / positives.length;
      best = { threshold: t, tar, far };
    }
  }
  return best;
}

async function main(): Promise<void> {
  const lfwDir = process.env.LFW_DIR;
  const pairsFile = process.env.PAIRS_FILE;
  if (!lfwDir || !pairsFile) {
    console.error(
      'Usage: LFW_DIR=<path to lfw_funneled/> PAIRS_FILE=<path to pairsDevTest.txt> npm run eval:lfw',
    );
    console.error("See this script's own doc comment for download URLs.");
    process.exit(1);
  }

  const pairs = parsePairsFile(pairsFile, lfwDir);
  const matchCount = pairs.filter((p) => p.isMatch).length;
  console.log(
    `Loaded ${pairs.length} pairs from ${pairsFile} (${matchCount} same-person, ${pairs.length - matchCount} different-person)`,
  );

  const cache = new Map<string, number[] | null>();
  const results: { isMatch: boolean; similarity: number }[] = [];
  let skipped = 0;
  const skippedExamples: string[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const vecA = await embeddingFor(pair.imageA, cache);
    const vecB = await embeddingFor(pair.imageB, cache);
    if (vecA === null || vecB === null) {
      skipped++;
      if (skippedExamples.length < 10) {
        skippedExamples.push(`${path.basename(pair.imageA)} / ${path.basename(pair.imageB)}`);
      }
      continue;
    }
    results.push({ isMatch: pair.isMatch, similarity: cosineSimilarity(vecA, vecB) });
    if ((i + 1) % 100 === 0) {
      console.log(`  ...${i + 1}/${pairs.length} pairs processed`);
    }
  }

  console.log(
    `\nProcessed ${results.length} pairs; skipped ${skipped} (no face detected in at least one image of the pair).`,
  );
  if (skippedExamples.length > 0) {
    console.log(
      `Example skipped pairs: ${skippedExamples.join(', ')}${skipped > 10 ? ', ...' : ''}`,
    );
  }

  let bestThreshold = 0;
  let bestAccuracy = 0;
  for (let t = 0; t <= 100; t++) {
    const threshold = t / 100;
    const acc = accuracyAt(results, threshold);
    if (acc > bestAccuracy) {
      bestAccuracy = acc;
      bestThreshold = threshold;
    }
  }

  const currentAccuracy = accuracyAt(results, CURRENT_THRESHOLD);
  const tar1pct = tarAtFar(results, 0.01);
  const tar01pct = tarAtFar(results, 0.001);

  const positives = results.filter((r) => r.isMatch).map((r) => r.similarity);
  const negatives = results.filter((r) => !r.isMatch).map((r) => r.similarity);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

  console.log('\n=== LFW pairsDevTest.txt verification results ===');
  console.log(`Same-person similarity:      mean ${mean(positives).toFixed(4)}`);
  console.log(`Different-person similarity: mean ${mean(negatives).toFixed(4)}`);
  console.log(
    `Current FACE_MATCH_THRESHOLD (${CURRENT_THRESHOLD}): accuracy ${(currentAccuracy * 100).toFixed(2)}%`,
  );
  console.log(
    `Empirically best threshold: ${bestThreshold.toFixed(2)}, accuracy ${(bestAccuracy * 100).toFixed(2)}%`,
  );
  console.log(
    `TAR @ FAR<=1%:   threshold ${tar1pct.threshold.toFixed(4)}, TAR ${(tar1pct.tar * 100).toFixed(2)}%, actual FAR ${(tar1pct.far * 100).toFixed(3)}%`,
  );
  console.log(
    `TAR @ FAR<=0.1%: threshold ${tar01pct.threshold.toFixed(4)}, TAR ${(tar01pct.tar * 100).toFixed(2)}%, actual FAR ${(tar01pct.far * 100).toFixed(3)}%`,
  );

  console.log('\n=== Threshold sweep (for choosing FACE_MATCH_THRESHOLD deliberately) ===');
  console.log('threshold  accuracy   FAR (false-accept rate)   FRR (false-reject rate)');
  const sweepThresholds = [
    0.1, 0.15, 0.2, 0.24, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85,
    0.9,
  ];
  const sweep = sweepThresholds.map((t) => {
    const falseAccepts = negatives.filter((s) => s >= t).length;
    const falseRejects = positives.filter((s) => s < t).length;
    return {
      threshold: t,
      accuracy: accuracyAt(results, t),
      far: negatives.length === 0 ? 0 : falseAccepts / negatives.length,
      frr: positives.length === 0 ? 0 : falseRejects / positives.length,
    };
  });
  for (const row of sweep) {
    console.log(
      `${row.threshold.toFixed(2)}       ${(row.accuracy * 100).toFixed(2)}%     ${(row.far * 100).toFixed(2)}%                      ${(row.frr * 100).toFixed(2)}%`,
    );
  }

  fs.writeFileSync(
    'lfw-eval-results.json',
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        pairsFile,
        totalPairs: pairs.length,
        processedPairs: results.length,
        skippedPairs: skipped,
        meanSimilaritySamePerson: mean(positives),
        meanSimilarityDifferentPerson: mean(negatives),
        currentThreshold: CURRENT_THRESHOLD,
        currentThresholdAccuracy: currentAccuracy,
        bestThreshold,
        bestThresholdAccuracy: bestAccuracy,
        tarAtFar1pct: tar1pct,
        tarAtFar0_1pct: tar01pct,
        thresholdSweep: sweep,
        rawResults: results,
      },
      null,
      2,
    ),
  );
  console.log('\nFull results written to lfw-eval-results.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
