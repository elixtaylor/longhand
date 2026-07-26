/**
 * A seeded pseudo-random generator for the validation harness.
 *
 * Property tests are only useful if a failure can be reproduced, so the
 * sequence must be identical on every run and on every machine — never
 * Math.random().
 */
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return {
    /** Uniform in [0, 1). */
    next(): number {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Integer in [lo, hi], inclusive. */
    int(lo: number, hi: number): number {
      return lo + Math.floor(this.next() * (hi - lo + 1));
    },
    /** Non-zero integer in [lo, hi], useful for leading coefficients. */
    nonZeroInt(lo: number, hi: number): number {
      let v = 0;
      while (v === 0) v = this.int(lo, hi);
      return v;
    },
    /** Float in [lo, hi). */
    float(lo: number, hi: number): number {
      return lo + this.next() * (hi - lo);
    },
    pick<T>(xs: readonly T[]): T {
      return xs[this.int(0, xs.length - 1)];
    },
  };
}

export type Rng = ReturnType<typeof makeRng>;

/** Assert two floats agree to a tolerance, with a useful message. */
export function close(actual: number, expected: number, tol = 1e-6): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  const scale = Math.max(1, Math.abs(expected));
  return Math.abs(actual - expected) <= tol * scale;
}

/**
 * Pull the numbers out of a LaTeX answer string, so a solver that only
 * exposes `solve` can still be checked numerically.
 */
export function numbersIn(latex: string): number[] {
  const cleaned = latex
    .replace(/\\dfrac\{(-?[\d.]+)\}\{(-?[\d.]+)\}/g, (_m, a, b) => String(Number(a) / Number(b)))
    .replace(/\\frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}/g, (_m, a, b) => String(Number(a) / Number(b)))
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/−/g, '-');
  const out: number[] = [];
  const re = /-?\d+(?:\.\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) out.push(Number(m[0]));
  return out;
}
