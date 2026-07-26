import { Poly } from './parse';
import { Rational } from './rational';

/**
 * Real roots of a polynomial, found the way a student would: rational roots
 * first (factor theorem), then the quadratic formula on what is left, with a
 * numeric sweep as a backstop for irrational cubic roots.
 */

export function evaluatePoly(p: Poly, x: number): number {
  let out = 0;
  for (const { power, coeff } of p.terms()) out += coeff.toNumber() * Math.pow(x, power);
  return out;
}

function divisors(n: number): number[] {
  n = Math.abs(Math.round(n));
  if (n === 0) return [1];
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}

/** Clear denominators so the rational-root theorem applies to integers. */
function integerCoeffs(p: Poly): { coeffs: number[]; degree: number } {
  const deg = p.degree();
  let lcm = 1;
  for (let k = 0; k <= deg; k++) {
    const d = p.get(k).d;
    lcm = (lcm * d) / gcdInt(lcm, d);
  }
  const coeffs: number[] = [];
  for (let k = 0; k <= deg; k++) coeffs.push(Math.round(p.get(k).toNumber() * lcm));
  return { coeffs, degree: deg };
}
function gcdInt(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Divide p by (x − r) exactly, assuming r is a root. */
function deflate(p: Poly, r: Rational): Poly {
  const deg = p.degree();
  const out = new Map<number, Rational>();
  let carry = Rational.int(0);
  for (let k = deg; k >= 1; k--) {
    const c = p.get(k).add(carry);
    out.set(k - 1, c);
    carry = c.mul(r);
  }
  return new Poly(out, p.variable);
}

/**
 * All distinct real roots, ascending. Exact where the maths allows and
 * numerically bracketed otherwise.
 */
export function realRoots(polyIn: Poly): number[] {
  let p = polyIn;
  const found: number[] = [];
  const MAX_CANDIDATES = 2000;

  // Peel off rational roots one at a time.
  let guard = 0;
  while (p.degree() >= 1 && guard++ < 20) {
    if (p.degree() <= 2) break;
    const { coeffs, degree } = integerCoeffs(p);
    const a0 = coeffs[0];
    const an = coeffs[degree];
    if (an === 0) break;

    const ps = a0 === 0 ? [0] : divisors(a0);
    const qs = divisors(an);
    if (ps.length * qs.length > MAX_CANDIDATES) break;

    let hit: Rational | null = null;
    outer: for (const num of ps) {
      for (const den of qs) {
        for (const sign of [1, -1]) {
          const cand = new Rational(sign * num, den);
          if (Math.abs(evaluatePoly(p, cand.toNumber())) < 1e-9) {
            hit = cand;
            break outer;
          }
        }
      }
    }
    if (!hit) break;
    found.push(hit.toNumber());
    p = deflate(p, hit);
  }

  // Finish exactly when a linear or quadratic factor remains.
  if (p.degree() === 1) {
    found.push(p.get(0).neg().div(p.get(1)).toNumber());
  } else if (p.degree() === 2) {
    const a = p.get(2).toNumber();
    const b = p.get(1).toNumber();
    const c = p.get(0).toNumber();
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      found.push((-b + s) / (2 * a), (-b - s) / (2 * a));
    }
  } else if (p.degree() >= 3) {
    found.push(...numericRoots(p));
  }

  const unique: number[] = [];
  for (const r of found.sort((x, y) => x - y)) {
    const clean = Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r) : r;
    if (!unique.some((u) => Math.abs(u - clean) < 1e-7)) unique.push(clean);
  }
  return unique;
}

/** Sample for sign changes, then bisect — enough for sketching. */
function numericRoots(p: Poly): number[] {
  const out: number[] = [];
  const LIMIT = 100;
  const STEP = 0.05;
  let prevX = -LIMIT;
  let prevY = evaluatePoly(p, prevX);
  for (let x = -LIMIT + STEP; x <= LIMIT; x += STEP) {
    const y = evaluatePoly(p, x);
    if (prevY === 0) out.push(prevX);
    else if (prevY * y < 0) out.push(bisect(p, prevX, x));
    prevX = x;
    prevY = y;
  }
  return out;
}

function bisect(p: Poly, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  for (let i = 0; i < 80; i++) {
    const mid = (a + b) / 2;
    if (evaluatePoly(p, a) * evaluatePoly(p, mid) <= 0) b = mid;
    else a = mid;
  }
  return (a + b) / 2;
}
