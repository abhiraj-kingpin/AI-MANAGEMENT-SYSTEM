import {
  estimateSimilarityTransform,
  REFERENCE_KEYPOINTS_112,
  warpAlignedFace,
  type Point2D,
  type RawImage,
} from '../../../src/modules/face-recognition/faceAlign';

function meanPoint(points: readonly Point2D[]): Point2D {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

describe('estimateSimilarityTransform', () => {
  it('is near-identity when src equals dst exactly', () => {
    const transform = estimateSimilarityTransform(REFERENCE_KEYPOINTS_112, REFERENCE_KEYPOINTS_112);

    expect(transform.scale).toBeCloseTo(1, 6);
    expect(transform.rotationRadians).toBeCloseTo(0, 6);
    expect(transform.a.im).toBeCloseTo(0, 6);
    expect(transform.b.re).toBeCloseTo(0, 6);
    expect(transform.b.im).toBeCloseTo(0, 6);
  });

  it('recovers a pure 2x scale (src scaled down from dst, from the origin)', () => {
    const dst = REFERENCE_KEYPOINTS_112;
    const src = dst.map((p) => ({ x: p.x * 0.5, y: p.y * 0.5 }));

    const transform = estimateSimilarityTransform(src, dst);

    expect(transform.scale).toBeCloseTo(2, 6);
    expect(transform.rotationRadians).toBeCloseTo(0, 6);
  });

  it('recovers the inverse of a known rotation applied around the centroid', () => {
    const dst = REFERENCE_KEYPOINTS_112;
    const center = meanPoint(dst);
    const appliedAngle = Math.PI / 2;

    const src = dst.map((p) => {
      const cx = p.x - center.x;
      const cy = p.y - center.y;
      return {
        x: center.x + (cx * Math.cos(appliedAngle) - cy * Math.sin(appliedAngle)),
        y: center.y + (cx * Math.sin(appliedAngle) + cy * Math.cos(appliedAngle)),
      };
    });

    const transform = estimateSimilarityTransform(src, dst);

    expect(transform.rotationRadians).toBeCloseTo(-appliedAngle, 5);
    expect(transform.scale).toBeCloseTo(1, 5);
  });

  it('recovers a pure translation', () => {
    const dst = REFERENCE_KEYPOINTS_112;
    const src = dst.map((p) => ({ x: p.x + 10, y: p.y - 20 }));

    const transform = estimateSimilarityTransform(src, dst);

    expect(transform.scale).toBeCloseTo(1, 5);
    expect(transform.rotationRadians).toBeCloseTo(0, 5);
    expect(transform.b.re).toBeCloseTo(-10, 4);
    expect(transform.b.im).toBeCloseTo(20, 4);
  });

  it('rejects mismatched-length point lists', () => {
    expect(() => estimateSimilarityTransform([{ x: 0, y: 0 }], REFERENCE_KEYPOINTS_112)).toThrow();
  });

  it('rejects fewer than 2 point correspondences', () => {
    expect(() => estimateSimilarityTransform([{ x: 0, y: 0 }], [{ x: 1, y: 1 }])).toThrow();
  });

  it('rejects degenerate (all-identical) source points', () => {
    const samePoint = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ];
    expect(() =>
      estimateSimilarityTransform(samePoint, REFERENCE_KEYPOINTS_112.slice(0, 3)),
    ).toThrow();
  });
});

describe('warpAlignedFace', () => {
  it('round-trips a 112x112 source whose landmarks already sit exactly at the reference positions', () => {
    const size = 112;
    const data = Buffer.alloc(size * size * 3);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 3;
        data[idx] = x % 256;
        data[idx + 1] = y % 256;
        data[idx + 2] = (x + y) % 256;
      }
    }
    const source: RawImage = { data, width: size, height: size, channels: 3 };

    const output = warpAlignedFace(source, REFERENCE_KEYPOINTS_112, size);

    for (const [x, y] of [
      [30, 30],
      [56, 56],
      [80, 40],
      [20, 90],
    ]) {
      const idx = (y * size + x) * 3;
      expect(Math.abs(output[idx] - data[idx])).toBeLessThanOrEqual(3);
    }
  });

  it('reproduces a solid color everywhere, regardless of the transform (bilinear sampling of a constant is that constant)', () => {
    const size = 40;
    const data = Buffer.alloc(size * size * 3, 0);
    for (let i = 0; i < size * size; i++) {
      data[i * 3] = 200;
      data[i * 3 + 1] = 100;
      data[i * 3 + 2] = 50;
    }
    const source: RawImage = { data, width: size, height: size, channels: 3 };

    const landmarks = REFERENCE_KEYPOINTS_112.map((p) => ({ x: p.x * 0.3 + 5, y: p.y * 0.3 + 5 }));

    const output = warpAlignedFace(source, landmarks, 112);

    const centerIdx = (56 * 112 + 56) * 3;
    expect(output[centerIdx]).toBeCloseTo(200, 0);
    expect(output[centerIdx + 1]).toBeCloseTo(100, 0);
    expect(output[centerIdx + 2]).toBeCloseTo(50, 0);
  });
});
