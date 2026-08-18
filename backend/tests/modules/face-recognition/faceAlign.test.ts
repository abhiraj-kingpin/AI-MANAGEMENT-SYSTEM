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
    const appliedAngle = Math.PI / 2; // rotate dst by +90 degrees to build src

    const src = dst.map((p) => {
      const cx = p.x - center.x;
      const cy = p.y - center.y;
      return {
        x: center.x + (cx * Math.cos(appliedAngle) - cy * Math.sin(appliedAngle)),
        y: center.y + (cx * Math.sin(appliedAngle) + cy * Math.cos(appliedAngle)),
      };
    });

    const transform = estimateSimilarityTransform(src, dst);

    // src->dst must undo the +90 degree rotation used to build src.
    expect(transform.rotationRadians).toBeCloseTo(-appliedAngle, 5);
    expect(transform.scale).toBeCloseTo(1, 5);
  });

  it('recovers a pure translation', () => {
    const dst = REFERENCE_KEYPOINTS_112;
    const src = dst.map((p) => ({ x: p.x + 10, y: p.y - 20 }));

    const transform = estimateSimilarityTransform(src, dst);

    expect(transform.scale).toBeCloseTo(1, 5);
    expect(transform.rotationRadians).toBeCloseTo(0, 5);
    // dst = src - (10, -20), so b (src->dst offset once rotation/scale are
    // identity) should be (-10, 20).
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
    // A 112x112 image with a distinct value at every pixel (a simple
    // gradient) — if the transform is correctly near-identity, sampling
    // should reproduce the same gradient, pixel for pixel (up to
    // floating-point/rounding noise from bilinear sampling at
    // near-integer coordinates).
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

    // Sample a handful of interior points (avoiding the very edge, where
    // bilinear sampling near a border is most sensitive to sub-pixel
    // rounding) and check they're within a couple of levels of the
    // original (an exact match isn't guaranteed — the estimated transform
    // is a least-squares fit, not a mathematically perfect identity, even
    // when src===dst exactly, since floating-point arithmetic alone
    // introduces sub-pixel noise).
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

    // Landmarks scaled down and offset from the reference template — a
    // real, non-trivial transform, not an identity case like the test
    // above.
    const landmarks = REFERENCE_KEYPOINTS_112.map((p) => ({ x: p.x * 0.3 + 5, y: p.y * 0.3 + 5 }));

    const output = warpAlignedFace(source, landmarks, 112);

    // Every fully-interior output pixel should sample the same constant
    // color (edges can pick up the black border where the warp reaches
    // outside the small source image).
    const centerIdx = (56 * 112 + 56) * 3;
    expect(output[centerIdx]).toBeCloseTo(200, 0);
    expect(output[centerIdx + 1]).toBeCloseTo(100, 0);
    expect(output[centerIdx + 2]).toBeCloseTo(50, 0);
  });
});
