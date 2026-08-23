
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

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
  size: number;
  splitFeature?: number;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
}

function harmonicNumber(i: number): number {
  if (i <= 0) return 0;
  return Math.log(i) + 0.5772156649015329;
}

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
  numTrees?: number;
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

  anomalyScore(point: readonly number[]): number {
    const avgPathLength =
      this.trees.reduce((sum, tree) => sum + pathLength(tree, point, 0), 0) / this.trees.length;
    if (this.normalizingConstant === 0) return 0.5;
    return Math.pow(2, -avgPathLength / this.normalizingConstant);
  }
}
