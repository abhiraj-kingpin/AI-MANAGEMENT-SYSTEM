import { IsolationForest } from '../../src/shared/ml/isolationForest';

/** A deterministic pseudo-random float generator local to this test file — for building a tight synthetic cluster, not for anything the algorithm itself depends on. */
function seededPoints(seed: number, count: number, center: number, spread: number): number[][] {
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  return Array.from({ length: count }, () => [
    center + (next() - 0.5) * spread,
    center + (next() - 0.5) * spread,
  ]);
}

describe('IsolationForest', () => {
  it('scores an obvious outlier higher than points in a dense cluster', () => {
    const cluster = seededPoints(1, 50, 0, 2); // 50 points tightly packed around (0,0)
    const outlier = [100, 100]; // far outside the cluster on both dimensions
    const data = [...cluster, outlier];

    const forest = new IsolationForest(data, { seed: 7 });

    const clusterScores = cluster.map((p) => forest.anomalyScore(p));
    const outlierScore = forest.anomalyScore(outlier);
    const maxClusterScore = Math.max(...clusterScores);

    expect(outlierScore).toBeGreaterThan(maxClusterScore);
    // Isolation forest scores are meant to sit near 0.5 for unremarkable
    // points and approach 1 for isolated ones — not just "higher than the
    // others" in a relative sense that could still be true of two equally
    // unremarkable numbers.
    expect(outlierScore).toBeGreaterThan(0.7);
  });

  it('gives every point in a uniform, featureless cluster a similarly unremarkable score', () => {
    const cluster = seededPoints(2, 60, 5, 1);
    const forest = new IsolationForest(cluster, { seed: 11 });

    const scores = cluster.map((p) => forest.anomalyScore(p));
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    // Not asserting exact equality (finite trees still have some
    // sampling variance) — asserting there's no single point standing out
    // the way the real outlier above does.
    expect(max - min).toBeLessThan(0.35);
    expect(max).toBeLessThan(0.75);
  });

  it('is deterministic given the same seed', () => {
    const data = seededPoints(3, 40, 0, 5);
    const point = [50, 50];

    const forestA = new IsolationForest(data, { seed: 99 });
    const forestB = new IsolationForest(data, { seed: 99 });

    expect(forestA.anomalyScore(point)).toBe(forestB.anomalyScore(point));
  });

  it('separates a clear 2-cluster outlier even with more feature dimensions', () => {
    // 4-dimensional points — most features constant/near-constant, one
    // feature (index 2) is where the outlier actually differs, to check
    // the algorithm doesn't need every dimension to carry signal.
    const inliers = Array.from({ length: 30 }, (_, i) => [1, 1, (i % 5) * 0.1, 1]);
    const outlier = [1, 1, 50, 1];

    const forest = new IsolationForest([...inliers, outlier], { seed: 5 });

    const inlierScores = inliers.map((p) => forest.anomalyScore(p));
    const outlierScore = forest.anomalyScore(outlier);

    expect(outlierScore).toBeGreaterThan(Math.max(...inlierScores));
  });

  it('rejects being constructed with zero data points', () => {
    expect(() => new IsolationForest([])).toThrow();
  });

  it('handles a dataset smaller than the default sample size without crashing', () => {
    const tiny = [
      [0, 0],
      [1, 1],
      [2, 2],
    ];
    const forest = new IsolationForest(tiny, { seed: 1 });
    for (const point of tiny) {
      const score = forest.anomalyScore(point);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});
