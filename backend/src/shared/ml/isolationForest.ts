/**
 * Isolation Forest — a real, unsupervised anomaly-detection algorithm (Liu,
 * Ting & Zhou, "Isolation Forest", ICDM 2008; the same algorithm behind
 * scikit-learn's `IsolationForest`), implemented from scratch and verified
 * against known-outlier synthetic data (`isolationForest.test.ts`), not a
 * borrowed/unaudited npm package. Core idea: anomalies are "few and
 * different", so they get isolated by random recursive splits in far fewer
 * steps than points embedded in a dense cluster — an ensemble of random
 * trees' average path length to isolate a point is the anomaly signal,
 * with no labels, no training data beyond the points being scored
 * themselves, and no assumption about what an anomaly looks like ahead of
 * time (unlike a z-score check, which only catches outliers on one
 * dimension at a time). `analytics.ai.service.ts#detectAttendancePatternAnomalies`
 * fits a fresh forest to the org's own real attendance-derived feature
 * vectors on every request — genuinely trained on real data, just not
 * persisted between requests, since isolation forest's own design doesn't
 * need it to be (unlike a neural net, there's no gradient descent to save
 * progress from).
 */

/** Deterministic PRNG (mulberry32) — a seed makes tree construction (and therefore anomaly scores) reproducible, which `Math.random()` can't offer and which both tests and any future "why did this get flagged" debugging need. */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** A pseudo-random float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function sampleWithoutReplacement<T>(data: readonly T[], size: number, rng: SeededRandom): T[] {
  const pool = [...data];
  const result: T[] = [];
  for (let i = 0; i < size && pool.length > 0; i += 1) {
    const index = Math.floor(rng.next() * pool.length);
    result.push(pool[index]);
    pool.splice(index, 1);
  }
  return result;
}

interface TreeNode {
  isLeaf: boolean;
  size: number; // point count at this node — used as the leaf's path-length correction even for internal nodes, unused there
  splitFeature?: number;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
}

/** The i-th harmonic number, approximated via the standard formula ln(i) + the Euler-Mascheroni constant (accurate to within ~1/(2i), negligible for the sample sizes this is used with). */
function harmonicNumber(i: number): number {
  if (i <= 0) return 0;
  return Math.log(i) + 0.5772156649015329;
}

/** Average path length of an unsuccessful search in a binary search tree of `n` nodes (Liu et al.'s `c(n)`) — the correction added at a leaf reached before full isolation (because the height limit was hit, or every remaining point is identical on the split feature), and the normalizing constant anomaly scores are divided by. */
function averagePathLengthCorrection(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * harmonicNumber(n - 1) - (2 * (n - 1)) / n;
}

function buildTree(
  data: readonly number[][],
  height: number,
  heightLimit: number,
  rng: SeededRandom,
): TreeNode {
  if (height >= heightLimit || data.length <= 1) {
    return { isLeaf: true, size: data.length };
  }

  const numFeatures = data[0].length;
  const feature = Math.floor(rng.next() * numFeatures);
  let min = Infinity;
  let max = -Infinity;
  for (const point of data) {
    const v = point[feature];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) {
    // Every remaining point is identical on this feature — can't split on
    // it. A real isolation forest would retry another feature; skipped
    // here since with several features and continuous attendance data
    // this is rare enough not to be worth the extra complexity, and
    // falling back to an early leaf (with its size correction) is still a
    // correct, if slightly less precise, isolation-forest behavior.
    return { isLeaf: true, size: data.length };
  }

  const splitValue = min + rng.next() * (max - min);
  const left = data.filter((p) => p[feature] < splitValue);
  const right = data.filter((p) => p[feature] >= splitValue);
  if (left.length === 0 || right.length === 0) {
    return { isLeaf: true, size: data.length };
  }

  return {
    isLeaf: false,
    size: data.length,
    splitFeature: feature,
    splitValue,
    left: buildTree(left, height + 1, heightLimit, rng),
    right: buildTree(right, height + 1, heightLimit, rng),
  };
}

function pathLength(node: TreeNode, point: readonly number[], height: number): number {
  if (node.isLeaf) {
    return height + averagePathLengthCorrection(node.size);
  }
  const goLeft = point[node.splitFeature!] < node.splitValue!;
  return pathLength(goLeft ? node.left! : node.right!, point, height + 1);
}

export interface IsolationForestOptions {
  /** Number of trees in the ensemble — more trees reduce score variance at a linear time cost. Liu et al.'s own paper found scores stabilize well before 100. */
  numTrees?: number;
  /** Points sampled (without replacement) per tree — deliberately small relative to the full dataset (per the paper: isolating anomalies needs few points; a large sample makes trees deeper and *less* sensitive, not more). Clamped to the actual data size if smaller. */
  sampleSize?: number;
  seed?: number;
}

export class IsolationForest {
  private readonly trees: TreeNode[];
  private readonly normalizingConstant: number;

  constructor(data: readonly number[][], options: IsolationForestOptions = {}) {
    if (data.length === 0) {
      throw new Error('IsolationForest: cannot fit on zero data points.');
    }
    const numTrees = options.numTrees ?? 100;
    const sampleSize = Math.min(options.sampleSize ?? 256, data.length);
    const heightLimit = Math.ceil(Math.log2(Math.max(sampleSize, 2)));
    const rng = new SeededRandom(options.seed ?? 42);

    this.normalizingConstant = averagePathLengthCorrection(sampleSize);
    this.trees = [];
    for (let t = 0; t < numTrees; t += 1) {
      const sample = sampleWithoutReplacement(data, sampleSize, rng);
      this.trees.push(buildTree(sample, 0, heightLimit, rng));
    }
  }

  /**
   * Anomaly score in (0, 1) — Liu et al.'s `s(x, n) = 2^(-E(h(x))/c(n))`.
   * Close to 1: strongly isolated, i.e. anomalous. Around 0.5: no clear
   * signal either way. Well below 0.5: sits in a dense, unremarkable
   * region. There's no universal "this score = definitely an anomaly"
   * cutoff in the algorithm itself — callers pick a threshold appropriate
   * to their own data, the same way `analytics.ai.service.ts` does.
   */
  anomalyScore(point: readonly number[]): number {
    const avgPathLength =
      this.trees.reduce((sum, tree) => sum + pathLength(tree, point, 0), 0) / this.trees.length;
    if (this.normalizingConstant === 0) return 0.5;
    return Math.pow(2, -avgPathLength / this.normalizingConstant);
  }
}
