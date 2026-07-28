/**
 * Numeric display helpers. Topics like trigonometry, finance and statistics
 * work in decimals rather than exact rationals, so they share one place that
 * decides how many figures to show and how to write them.
 */

/**
 * Round to `dp` decimal places, half away from zero.
 *
 * Binary floating point stores some exact halves a hair low — 20000×0.85⁴ is
 * mathematically $10440.125 but held as 10440.124999999998, which would round
 * down to .12 and quietly give the wrong money answer. Nudging by a *relative*
 * epsilon first pulls those values back onto the .5 boundary. The nudge is far
 * too small (1 part in 10¹²) to disturb a value that genuinely rounds down.
 */
export function round(x: number, dp = 2): number {
  const f = Math.pow(10, dp);
  const scaled = x * f;
  // Past 2^53 the scaled value has no fractional bits left, so rounding it
  // invents digits: e^25 printed as …337.45789 when it is …337.38587. Let
  // toFixed do it at that size, which works from the decimal expansion.
  if (!Number.isSafeInteger(Math.round(scaled))) return Number(x.toFixed(Math.min(dp, 100)));
  const nudged = scaled + Math.sign(scaled) * Math.abs(scaled) * 1e-12;
  return Math.round(nudged) / f;
}

/** Format a number for display: round, then strip trailing zeros. */
export function fmt(x: number, dp = 2): string {
  if (!Number.isFinite(x)) return '\\text{undefined}';
  if (Number.isInteger(x)) return String(x);
  const r = round(x, dp);
  if (Number.isInteger(r)) return String(r);
  return String(r).replace(/0+$/, '').replace(/\.$/, '');
}

/** Format money to exactly 2 dp with thousands separators, rounding half up. */
export function money(x: number): string {
  return round(x, 2).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Wrap in parentheses when negative — for safe substitution into formulae. */
export function par(x: number, dp = 4): string {
  return x < 0 ? `\\left(${fmt(x, dp)}\\right)` : fmt(x, dp);
}

export const deg2rad = (d: number): number => (d * Math.PI) / 180;
export const rad2deg = (r: number): number => (r * 180) / Math.PI;

/** Greatest common divisor of two integers. */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Parse a list of numbers from "1, 2, 3" / "1 2 3" / newline separated. */
export function parseNumberList(input: string): number[] {
  const parts = input
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new Error('That list should only contain numbers, e.g.  4, 8, 15, 16, 23');
  }
  return nums;
}

/**
 * Parse `key=value` pairs, e.g. "a=7, b=9, C=40". Keys stay case-sensitive
 * because trigonometry uses lowercase for sides and uppercase for angles.
 */
export function parseParams(input: string): Record<string, number> {
  const out: Record<string, number> = {};
  // The value has to be the *whole* value. Without a guard, "a = 3+4"
  // yielded a = 3 and the "+ 4" vanished — a triangle solved from the wrong
  // side, with no sign anything had been dropped. Refusing here lets the
  // caller retry with the arithmetic worked out (see nl/arithmetic.ts).
  //
  // The guard has to look for a *digit* after the operator, not merely the
  // operator character. Sentences end in full stops and clauses are joined by
  // dashes: "C = 40. Find c" and "C = 40 - find c" are punctuation, not
  // arithmetic. Rejecting those dropped the angle entirely, which left only
  // two knowns — enough for the right-triangle solver to claim the question
  // and apply Pythagoras to a triangle that has no right angle.
  const re = /([A-Za-z][A-Za-z0-9_]*)\s*=\s*(-?\d*\.?\d+)(?!\d|\.\d|\s*[+\-*/^×÷]\s*\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) out[m[1]] = Number(m[2]);
  return out;
}

/**
 * The inverse of `parseParams`: keys with a value become "key=value" pairs,
 * joined the same way a student would type them. A key with no value (an
 * empty array — see StructuredInputForm's optional number fields) is left
 * out entirely rather than serialised as blank or zero.
 */
export function formatParams(values: Record<string, number[]>): string {
  return Object.entries(values)
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `${k}=${v[0]}`)
    .join(', ');
}

/** n! for small non-negative integers. */
export function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Binomial coefficient nCr. */
export function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  let out = 1;
  for (let i = 0; i < r; i++) out = (out * (n - i)) / (i + 1);
  return Math.round(out);
}
