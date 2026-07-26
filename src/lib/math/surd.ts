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
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`simplifySqrt: expected a non-negative integer, got ${n}`);
  }
  if (n === 0) return { outside: 0, inside: 1 };
  let outside = 1;
  let inside = n;
  for (let f = 2; f * f <= inside; f++) {
    while (inside % (f * f) === 0) {
      inside /= f * f;
      outside *= f;
    }
  }
  return { outside, inside };
}

/** True when n is a perfect square. */
export function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}
