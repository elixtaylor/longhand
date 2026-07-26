import { Rational } from './rational';
import { proseWordsIn } from '../nl/vocabulary';

/**
 * A single-variable polynomial with exact rational coefficients, stored as
 * power -> coefficient. This one model backs the quadratics, linear-equation
 * and calculus solvers, so parsing lives in one tested place.
 */
export interface Monomial {
  power: number;
  coeff: Rational;
}

export class Poly {
  constructor(
    readonly coeffs: Map<number, Rational>,
    readonly variable = 'x',
  ) {}

  get(power: number): Rational {
    return this.coeffs.get(power) ?? Rational.int(0);
  }

  degree(): number {
    let d = 0;
    for (const [p, c] of this.coeffs) if (!c.isZero() && p > d) d = p;
    return d;
  }

  /** Non-zero terms, highest power first. */
  terms(): Monomial[] {
    return [...this.coeffs.entries()]
      .filter(([, c]) => !c.isZero())
      .map(([power, coeff]) => ({ power, coeff }))
      .sort((a, b) => b.power - a.power);
  }

  isZeroPoly(): boolean {
    return this.terms().length === 0;
  }

  add(o: Poly): Poly {
    const m = new Map(this.coeffs);
    for (const [p, c] of o.coeffs) m.set(p, (m.get(p) ?? Rational.int(0)).add(c));
    return new Poly(m, this.variable);
  }
  sub(o: Poly): Poly {
    const m = new Map(this.coeffs);
    for (const [p, c] of o.coeffs) m.set(p, (m.get(p) ?? Rational.int(0)).sub(c));
    return new Poly(m, this.variable);
  }

  mul(o: Poly): Poly {
    const m = new Map<number, Rational>();
    for (const { power: p1, coeff: c1 } of this.terms()) {
      for (const { power: p2, coeff: c2 } of o.terms()) {
        const p = p1 + p2;
        m.set(p, (m.get(p) ?? Rational.int(0)).add(c1.mul(c2)));
      }
    }
    return new Poly(m, this.variable);
  }

  scale(k: Rational): Poly {
    const m = new Map<number, Rational>();
    for (const [p, c] of this.coeffs) m.set(p, c.mul(k));
    return new Poly(m, this.variable);
  }

  /** Evaluate at a rational value. */
  at(x: Rational): Rational {
    let out = Rational.int(0);
    for (const { power, coeff } of this.terms()) out = out.add(coeff.mul(x.pow(power)));
    return out;
  }

  /** The polynomial p(x + c), expanded via the binomial theorem. */
  shift(c: Rational): Poly {
    let out = new Poly(new Map(), this.variable);
    for (const { power: n, coeff: a } of this.terms()) {
      // a(x + c)^n = a · Σ C(n,k) x^(n−k) c^k
      const m = new Map<number, Rational>();
      let binom = 1;
      for (let k = 0; k <= n; k++) {
        const term = a.mul(Rational.int(binom)).mul(c.pow(k));
        const p = n - k;
        m.set(p, (m.get(p) ?? Rational.int(0)).add(term));
        binom = (binom * (n - k)) / (k + 1);
      }
      out = out.add(new Poly(m, this.variable));
    }
    return out;
  }

  /** True when two polynomials are identical term by term. */
  equals(o: Poly): boolean {
    return this.sub(o).isZeroPoly();
  }
}

export class ParseError extends Error {}

/** Normalise unicode maths characters to ASCII the parser understands. */
export function normalise(input: string): string {
  return input
    .replace(/−/g, '-') // minus sign
    .replace(/[×⋅•]/g, '*') // ×, ⋅, •
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/\s+/g, '')
    .trim();
}

/** Detect the variable letter in an expression (defaults to 'x'). */
export function detectVariable(input: string): string {
  const m = normalise(input).match(/[a-z]/i);
  return (m?.[0] ?? 'x').toLowerCase();
}

/** Parse one side of an equation (a sum of monomials) into a Poly. */
export function parsePoly(inputRaw: string, variable = 'x'): Poly {
  const v = variable.toLowerCase();
  // Catch English before whitespace is stripped: afterwards "2x and y" has
  // become "2xandy", where "and" is indistinguishable from a run of variables.
  const prose = proseWordsIn(inputRaw);
  if (prose.length > 0) {
    throw new ParseError(`“${prose[0]}” isn’t part of an expression.`);
  }
  let s = normalise(inputRaw).toLowerCase();
  // The star is dropped so "3*x" reads as the implicit product 3x. Between
  // two digits it is real arithmetic this parser cannot do, and deleting it
  // silently turned "2*7" into twenty-seven.
  if (/\d\*\d/.test(s)) {
    throw new ParseError(`Work out "${s.match(/\d+\*\d+/)?.[0]}" first — this reads polynomials, not arithmetic.`);
  }
  s = s.replace(/\*/g, '');
  if (s === '') throw new ParseError('Nothing to parse.');

  // Turn every subtraction into "+-" so terms split cleanly. There are no
  // parentheses or negative exponents in the supported forms.
  s = s.replace(/-/g, '+-');
  const chunks = s.split('+').filter((c) => c !== '');

  const coeffs = new Map<number, Rational>();
  for (const chunk of chunks) {
    const { power, coeff } = parseMonomial(chunk, v);
    coeffs.set(power, (coeffs.get(power) ?? Rational.int(0)).add(coeff));
  }
  return new Poly(coeffs, v);
}

function parseMonomial(chunk: string, v: string): Monomial {
  const vi = chunk.indexOf(v);

  // Constant term (no variable present).
  if (vi === -1) {
    if (!/^[+\-]?\d/.test(chunk)) {
      throw new ParseError(`Couldn't read the term "${chunk}".`);
    }
    return { power: 0, coeff: Rational.parse(chunk) };
  }

  const coeffStr = chunk.slice(0, vi);
  const rest = chunk.slice(vi + 1);

  let power = 1;
  if (rest.startsWith('^')) {
    // parseInt stops at the first non-digit and reports success, so "^2sinx"
    // used to read as power 2 with the rest of the input silently discarded.
    // The exponent has to be the whole remainder.
    const exp = rest.slice(1);
    if (!/^\d+$/.test(exp)) {
      throw new ParseError(`Unsupported power in "${chunk}". Use a whole number like ${v}^2.`);
    }
    power = parseInt(exp, 10);
  } else if (rest !== '') {
    throw new ParseError(`Couldn't read "${chunk}".`);
  }

  let coeff: Rational;
  if (coeffStr === '' || coeffStr === '+') coeff = Rational.int(1);
  else if (coeffStr === '-') coeff = Rational.int(-1);
  else coeff = Rational.parse(coeffStr);

  return { power, coeff };
}

export interface Equation {
  lhs: Poly;
  rhs: Poly;
  variable: string;
}

/** Parse "lhs = rhs" (rhs defaults to 0 when there is no "="). */
export function parseEquation(inputRaw: string, variable?: string): Equation {
  const v = variable ?? 'x';
  const parts = normalise(inputRaw).split('=');
  if (parts.length > 2) throw new ParseError('Too many "=" signs.');
  const lhs = parsePoly(parts[0], v);
  const rhs = parts.length === 2 ? parsePoly(parts[1], v) : new Poly(new Map(), v);
  return { lhs, rhs, variable: v };
}

/** Reduce an equation to standard form  poly = 0  (returns the left poly). */
export function toStandardForm(eq: Equation): Poly {
  return eq.lhs.sub(eq.rhs);
}
