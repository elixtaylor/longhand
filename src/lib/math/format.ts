import { Rational } from './rational';
import { Poly } from './parse';

/** Rational -> LaTeX. Integers plain; fractions as \frac with sign outside. */
export function rl(r: Rational): string {
  if (r.isInt()) return String(r.n);
  const sign = r.n < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(r.n)}}{${r.d}}`;
}

/** A rational wrapped in parentheses when it is negative (for substitution). */
export function rlParen(r: Rational): string {
  return r.isNeg() ? `\\left(${rl(r)}\\right)` : rl(r);
}

/** Body of a monomial: coefficient magnitude + variable^power (no sign). */
function monoBody(mag: Rational, power: number, v: string): string {
  if (power === 0) return rl(mag);
  const coeff = mag.eq(Rational.int(1)) ? '' : rl(mag);
  const varPart = power === 1 ? v : `${v}^{${power}}`;
  return coeff + varPart;
}

/** Whole polynomial as LaTeX, e.g. 2x^{2} + 7x - 4. */
export function polyLatex(poly: Poly): string {
  const terms = poly.terms();
  if (terms.length === 0) return '0';
  let out = '';
  terms.forEach((t, i) => {
    const neg = t.coeff.isNeg();
    const mag = t.coeff.abs();
    if (i === 0) out += neg ? '-' : '';
    else out += neg ? ' - ' : ' + ';
    out += monoBody(mag, t.power, poly.variable);
  });
  return out;
}

/** A single term prefixed with its sign as a connective, e.g. " + 3x". */
export function connectTerm(coeff: Rational, power: number, v: string): string {
  const neg = coeff.isNeg();
  const mag = coeff.abs();
  return `${neg ? ' - ' : ' + '}${monoBody(mag, power, v)}`;
}

/** "+" or "-" for the sign of r (used inline in prose/derivations). */
export function pm(r: Rational): string {
  return r.isNeg() ? '-' : '+';
}
