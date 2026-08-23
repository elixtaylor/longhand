/**
 * Surd simplification: write √n as (outside)·√(inside) with inside square-free.
 * Used to render exact irrational roots, e.g. √48 = 4√3, the way a student
 * would leave a surd answer rather than a decimal.
 */

export interface Surd {
  outside: number; // integer coefficient in front of the root
  inside: number; // square-free radicand (1 when the root is exact)
}

/** Simplify √n for n >= 0. Throws for negative n (no real square root). */
export function simplifySqrt(n: number): Surd {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`simplifySqrt: expected a non-negative integer, got ${n}`);
  }
  if (n === 0) return { outside: 0, inside: 1 };
  const exactRoot = Math.round(Math.sqrt(n));
  if (exactRoot * exactRoot === n) return { outside: exactRoot, inside: 1 };
  let outside = 1;
  let inside = n;
  // Trial division is ideal for ordinary classroom radicands but becomes a
  // browser freeze for a large prime near Number.MAX_SAFE_INTEGER. Extract
  // every small square factor, then stop at a strict work bound. The result
  // remains exactly equivalent even if an exotic large square factor remains
  // inside the radical.
  const MAX_TRIAL_FACTOR = 100_000;
  for (let f = 2; f * f <= inside && f <= MAX_TRIAL_FACTOR; f++) {
    while (inside % (f * f) === 0) {
      inside /= f * f;
      outside *= f;
    }
  }
  const remainingRoot = Math.round(Math.sqrt(inside));
  if (remainingRoot * remainingRoot === inside) {
    outside *= remainingRoot;
    inside = 1;
  }
  return { outside, inside };
}

/** True when n is a perfect square. */
export function isPerfectSquare(n: number): boolean {
  if (!Number.isSafeInteger(n) || n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}
