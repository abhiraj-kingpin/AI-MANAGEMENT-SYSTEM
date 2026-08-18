export interface Point2D {
  x: number;
  y: number;
}

/**
 * InsightFace's standard 112×112 face-alignment reference template
 * ("arcface_dst") — the canonical target position for [left eye, right
 * eye, nose tip, left mouth corner, right mouth corner] every aligned face
 * crop is warped toward, so a crop's landmarks land in the same place
 * MobileFaceNet was trained to expect them. Verified against InsightFace's
 * own `utils/face_align.py` source, not derived independently.
 */
export const REFERENCE_KEYPOINTS_112: readonly Point2D[] = [
  { x: 38.2946, y: 51.6963 },
  { x: 73.5318, y: 51.5014 },
  { x: 56.0252, y: 71.7366 },
  { x: 41.5493, y: 92.3655 },
  { x: 70.7299, y: 92.2041 },
];

export interface SimilarityTransform {
  /** Forward transform: dst ≈ a*src + b, in complex-number form — `a` encodes rotation+scale, `b` encodes translation. */
  a: { re: number; im: number };
  b: { re: number; im: number };
  scale: number;
  rotationRadians: number;
}

/**
 * Least-squares best-fit 2D similarity transform (uniform scale + rotation
 * + translation — no shear, no reflection) mapping `src` points onto `dst`
 * points. The same restricted-Procrustes problem
 * `skimage.transform.SimilarityTransform.estimate()` solves via Umeyama's
 * SVD-based algorithm (what InsightFace's own `face_align.py` calls) —
 * solved here in closed form instead, via the complex-plane least-squares
 * fit for `dst_i ≈ a*src_i + b`. Equivalent to Umeyama's result whenever no
 * reflection is needed to align the points, which is always true for real
 * face landmarks matched against this reference template (both share the
 * same left-right handedness under normal conditions) — avoids needing a
 * general 2×2 SVD implementation for a case that never needs the branch
 * that would require one.
 *
 * Derivation: minimizing `Σ|dst_i' - a·src_i'|²` (points pre-centered on
 * their own means) over complex scalar `a`, via Wirtinger calculus
 * (∂/∂ā = 0), gives `a = Σ(conj(src_i')·dst_i') / Σ|src_i'|²`.
 */
export function estimateSimilarityTransform(
  src: readonly Point2D[],
  dst: readonly Point2D[],
): SimilarityTransform {
  if (src.length !== dst.length) {
    throw new Error('estimateSimilarityTransform: src and dst must have the same length.');
  }
  if (src.length < 2) {
    throw new Error('estimateSimilarityTransform: need at least 2 point correspondences.');
  }

  const srcMean = meanPoint(src);
  const dstMean = meanPoint(dst);

  let numRe = 0;
  let numIm = 0;
  let den = 0;
  for (let i = 0; i < src.length; i++) {
    const px = src[i].x - srcMean.x;
    const py = src[i].y - srcMean.y;
    const qx = dst[i].x - dstMean.x;
    const qy = dst[i].y - dstMean.y;
    // conj(p) * q = (px - i·py)(qx + i·qy) = (px·qx + py·qy) + i(px·qy - py·qx)
    numRe += px * qx + py * qy;
    numIm += px * qy - py * qx;
    den += px * px + py * py;
  }
  if (den === 0) {
    throw new Error('estimateSimilarityTransform: source points are degenerate (all identical).');
  }

  const aRe = numRe / den;
  const aIm = numIm / den;
  // b = dstMean - a*srcMean, expanded as complex multiplication.
  const bRe = dstMean.x - (aRe * srcMean.x - aIm * srcMean.y);
  const bIm = dstMean.y - (aIm * srcMean.x + aRe * srcMean.y);

  return {
    a: { re: aRe, im: aIm },
    b: { re: bRe, im: bIm },
    scale: Math.sqrt(aRe * aRe + aIm * aIm),
    rotationRadians: Math.atan2(aIm, aRe),
  };
}

function meanPoint(points: readonly Point2D[]): Point2D {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export interface RawImage {
  data: Buffer;
  width: number;
  height: number;
  /** Channels per pixel in `data` — only the first 3 (assumed RGB) are read. */
  channels: number;
}

/**
 * Warps a `size`×`size` crop out of `source`'s pixel data such that
 * `landmarks` land on `REFERENCE_KEYPOINTS_112` (scaled to `size`, if not
 * 112) — the standard InsightFace face-alignment crop MobileFaceNet was
 * trained on, not a plain bounding-box crop. An inverse-mapped
 * bilinear-sampling implementation of its own (not a third-party warp
 * call) for full control over exactly what "aligned face" means here, and
 * so the geometry is directly unit-testable against known cases rather
 * than trusting an opaque library call's exact convention.
 */
export function warpAlignedFace(
  source: RawImage,
  landmarks: readonly Point2D[],
  size = 112,
): Buffer {
  const referencePoints =
    size === 112
      ? REFERENCE_KEYPOINTS_112
      : REFERENCE_KEYPOINTS_112.map((p) => ({ x: (p.x / 112) * size, y: (p.y / 112) * size }));

  const { a, b } = estimateSimilarityTransform(landmarks, referencePoints);
  // Inverse of the rotation-scale matrix [[a.re,-a.im],[a.im,a.re]] is
  // (1/det)*[[a.re,a.im],[-a.im,a.re]] — a scaled rotation matrix's
  // inverse, since det = a.re²+a.im² = scale².
  const det = a.re * a.re + a.im * a.im;

  const output = Buffer.alloc(size * size * 3);

  for (let oy = 0; oy < size; oy++) {
    for (let ox = 0; ox < size; ox++) {
      const dx = ox - b.re;
      const dy = oy - b.im;
      const sx = (a.re * dx + a.im * dy) / det;
      const sy = (-a.im * dx + a.re * dy) / det;

      const [r, g, bch] = bilinearSample(source, sx, sy);
      const outIdx = (oy * size + ox) * 3;
      output[outIdx] = r;
      output[outIdx + 1] = g;
      output[outIdx + 2] = bch;
    }
  }

  return output;
}

/** Black border for out-of-bounds samples — matches cv2.warpAffine's default `borderValue=0.0`. */
function bilinearSample(source: RawImage, x: number, y: number): [number, number, number] {
  const { data, width, height, channels } = source;
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return [0, 0, 0];

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const fx = x - x0;
  const fy = y - y0;

  const px = (xx: number, yy: number, c: number) => data[(yy * width + xx) * channels + c];

  const result: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const top = px(x0, y0, c) * (1 - fx) + px(x1, y0, c) * fx;
    const bottom = px(x0, y1, c) * (1 - fx) + px(x1, y1, c) * fx;
    result[c] = Math.round(top * (1 - fy) + bottom * fy);
  }
  return result;
}
