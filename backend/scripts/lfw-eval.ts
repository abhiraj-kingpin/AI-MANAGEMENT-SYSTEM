/**
 * Real face-verification accuracy evaluation against LFW (Labeled Faces in
 * the Wild) — the standard academic benchmark for unconstrained face
 * verification (13,233 photos, 5,749 named public figures, UMass Amherst).
 * Runs this backend's actual, real detect->align->embed pipeline
 * (`faceEmbedding.provider.ts`, SCRFD + MobileFaceNet) and the actual
 * cosine-similarity matching function (`shared/utils/vectorMath.ts`) this
 * app uses in production — not a separate/simplified re-implementation.
 * `FACE_MATCH_THRESHOLD`'s default (0.85, `config/env.ts`) has been a
 * guess since it was introduced; this is what closes that gap with a real
 * measurement instead of leaving it a guess indefinitely.
 *
 * The LFW dataset itself is deliberately NOT committed to this repo — same
 * reasoning as the one CC0 portrait used to manually verify SCRFD detection
 * in v1.1.7 (distributing real people's photos in a public repository
 * isn't appropriate, even a long-standing, ethically-established academic
 * benchmark of named public figures using photos already public on the
 * web). This script reads it from a local, gitignored directory instead.
 *
 * Uses `pairsDevTest.txt`, LFW's own standard "dev-test" split: 500
 * same-person pairs + 500 different-person pairs, a fixed, published,
 * deterministic split (not randomly sampled by this script) — the same
 * file `sklearn.datasets.fetch_lfw_pairs(subset='test')` uses.
 *
 * Usage:
 *   1. Download (both mirrored on figshare, the same mirror scikit-learn's
 *      own `sklearn.datasets._lfw` module downloads from — verified by
 *      reading that module's source, not guessed):
 *        https://ndownloader.figshare.com/files/5976015  (lfw-funneled.tgz, ~173MB)
 *          sha256: b47c8422c8cded889dc5a13418c4bc2abbda121092b3533a83306f90d900100a
 *        https://ndownloader.figshare.com/files/5976009  (pairsDevTest.txt, ~26KB)
 *          sha256: 7cb06600ea8b2814ac26e946201cdb304296262aad67d046a16a7ec85d0ff87c
 *   2. Extract lfw-funneled.tgz — produces a top-level `lfw_funneled/` directory
 *      of one subdirectory per person, e.g. `lfw_funneled/Colin_Powell/Colin_Powell_0001.jpg`.
 *   3. Run:
 *        LFW_DIR=/path/to/lfw_funneled PAIRS_FILE=/path/to/pairsDevTest.txt npm run eval:lfw
 *
 * Outputs a summary to stdout and a machine-readable `lfw-eval-results.json`
 * in the current working directory (also gitignored — this is a real
 * result from a real run, meant to be read and then written up in
 * README.md/CHANGELOG.md by hand, not committed as a raw artifact that'll
 * silently go stale).
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  generateFaceEmbedding,
  NoFaceDetectedError,
} from '../src/modules/face-recognition/faceEmbedding.provider';
import { cosineSimilarity } from '../src/shared/utils/vectorMath';

const CURRENT_THRESHOLD = 0.85; // config/env.ts's FACE_MATCH_THRESHOLD default

interface Pair {
  isMatch: boolean;
  imageA: string;
  imageB: string;
}

function lfwImagePath(lfwDir: string, name: string, imgNum: string): string {
  const padded = imgNum.padStart(4, '0');
  return path.join(lfwDir, name, `${name}_${padded}.jpg`);
}

/**
 * LFW's pairs.txt format: a header line with the pair count, then that
 * many matched-pair lines (`name\timg1\timg2`), then that many
 * mismatched-pair lines (`name1\timg1\tname2\timg2`) — see the real file
 * itself (fetched and inspected before writing this parser, not assumed).
 */
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

/** Cached per image path — the same image appears in multiple pairs (a same-person pair's two images each also appear in other pairs), so this avoids re-running detection+embedding on a file already processed. */
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

/** The lowest threshold at which the false-accept rate is <= targetFar — standard "TAR@FAR" reporting for a verification system, more informative than plain accuracy alone since it shows the real security/convenience trade-off. */
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
      // Thresholds are sorted ascending, and a lower threshold only ever
      // accepts more (both true and false) — the last one that still
      // satisfies the FAR budget gives the highest TAR within that budget.
      best = { threshold: t, tar, far };
    }
  }
  return best;
}

// This is a CLI reporting tool — its entire job is printing results, so
// `console.log` here is the intended output channel, not a stray debug
// statement the shared `no-console` rule (aimed at app code) is meant to
// catch — same reasoning as perf-smoke.ts's own eslint-disable.
/* eslint-disable no-console */
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
        // Raw per-pair similarities, so a threshold decision can be
        // re-examined later without re-running the ~10-15 minute real
        // inference pass over every pair again.
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
