import { Rational } from '../../lib/math/rational';
import { parsePoly, Poly, ParseError } from '../../lib/math/parse';
import { polyLatex, rlPlain } from '../../lib/math/format';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Polynomials (SACE Stage 1 Mathematical Methods): the factor and remainder
 * theorems, and dividing one polynomial by a linear factor.
 */

/** Evaluate P(x) at a rational value. */
export function evaluate(p: Poly, x: Rational): Rational {
  let out = Rational.int(0);
  for (const { power, coeff } of p.terms()) {
    out = out.add(coeff.mul(x.pow(power)));
  }
  return out;
}

/** Divide P(x) by (x − a) using synthetic division. Returns quotient + remainder. */
export function syntheticDivide(p: Poly, a: Rational): { quotient: Poly; remainder: Rational; working: Rational[] } {
  const deg = p.degree();
  const coeffs: Rational[] = [];
  for (let k = deg; k >= 0; k--) coeffs.push(p.get(k));

  const working: Rational[] = [];
  let carry = Rational.int(0);
  const outCoeffs: Rational[] = [];
  coeffs.forEach((c, i) => {
    const value = i === 0 ? c : c.add(carry);
    working.push(value);
    if (i < coeffs.length - 1) {
      outCoeffs.push(value);
      carry = value.mul(a);
    }
  });

  const remainder = working[working.length - 1];
  const m = new Map<number, Rational>();
  outCoeffs.forEach((c, i) => m.set(deg - 1 - i, c));
  return { quotient: new Poly(m, p.variable), remainder, working };
}

/** Whole-number divisors of n, positive and negative. */
function divisors(n: number): number[] {
  const a = Math.abs(Math.round(n));
  if (a === 0) return [0];
  const out: number[] = [];
  for (let i = 1; i <= a; i++) if (a % i === 0) out.push(i, -i);
  return out.sort((x, y) => Math.abs(x) - Math.abs(y) || x - y);
}

/** Candidate rational roots p/q from the rational root theorem. */
export function candidates(p: Poly): Rational[] {
  const deg = p.degree();
  // Clear denominators so the theorem applies to integer coefficients.
  let mult = 1;
  for (const { coeff } of p.terms()) mult = (mult * coeff.d) / gcdInt(mult, coeff.d);
  const constant = p.get(0).mul(Rational.int(mult));
  const lead = p.get(deg).mul(Rational.int(mult));
  if (constant.isZero()) return [Rational.int(0)];

  const ps = divisors(constant.n);
  const qs = divisors(lead.n).filter((q) => q > 0);
  const seen = new Set<string>();
  const out: Rational[] = [];
  for (const q of qs) {
    for (const pp of ps) {
      const r = new Rational(pp, q);
      const key = `${r.n}/${r.d}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    }
  }
  return out;
}
function gcdInt(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function rl(r: Rational): string {
  return r.isInt() ? String(r.n) : `\\frac{${r.n}}{${r.d}}`;
}
/** "(x − a)" with the sign handled. */
function factorLatex(a: Rational): string {
  if (a.isZero()) return 'x';
  return a.isNeg() ? `(x + ${rl(a.abs())})` : `(x - ${rl(a)})`;
}
/** Same as factorLatex, but plain text — for notes/annotations outside $..$. */
function factorPlain(a: Rational): string {
  if (a.isZero()) return 'x';
  return a.isNeg() ? `(x + ${rlPlain(a.abs())})` : `(x - ${rlPlain(a)})`;
}

/** Split "P(x) ÷ (x - a)" into its two parts, if the student wrote a divisor. */
function splitDivision(input: string): { dividend: string; root: Rational } | null {
  const m = input.match(/^(.*?)(?:÷|\/)\s*\(?\s*x\s*([+-])\s*(\d+(?:\.\d+)?)\s*\)?\s*$/i);
  if (!m) return null;
  const sign = m[2] === '-' ? 1 : -1;
  return { dividend: m[1], root: Rational.parse(String(sign * Number(m[3]))) };
}

/* ------------------------------------------------------------ factorising */
function byFactorTheorem(p: Poly): SolveResult {
  const original = polyLatex(p);
  const steps: Step[] = [
    {
      note: 'The factor theorem says $(x - a)$ is a factor of $P(x)$ exactly when $P(a) = 0$.',
      latex: `P(x) = ${original}`,
    },
  ];

  let current = p;
  const factors: Rational[] = [];
  let guard = 0;

  while (current.degree() > 2 && guard++ < 6) {
    const found = candidates(current).find((c) => evaluate(current, c).isZero());
    if (!found) break;
    steps.push({
      note: `Test the possible roots. Substituting $x = ${rl(found)}$ gives zero, so ${factorPlain(found)} is a factor.`,
      latex: `P(${rl(found)}) = 0`,
      annotation: `${factorPlain(found)} is a factor`,
    });
    const { quotient } = syntheticDivide(current, found);
    steps.push({
      note: 'Divide it out to get the remaining polynomial.',
      latex: `${polyLatex(current)} = ${factorLatex(found)}\\left(${polyLatex(quotient)}\\right)`,
    });
    factors.push(found);
    current = quotient;
  }

  // Finish a quadratic remainder by finding its roots.
  if (current.degree() === 2) {
    const found = candidates(current).find((c) => evaluate(current, c).isZero());
    if (found) {
      const { quotient } = syntheticDivide(current, found);
      steps.push({
        note: `The quadratic factorises too: $P(${rl(found)}) = 0$, so ${factorPlain(found)} is a factor.`,
        latex: `${polyLatex(current)} = ${factorLatex(found)}\\left(${polyLatex(quotient)}\\right)`,
      });
      factors.push(found);
      current = quotient;
      const last = candidates(current).find((c) => evaluate(current, c).isZero());
      if (last && current.degree() === 1) {
        factors.push(last);
        current = new Poly(new Map([[0, current.get(1)]]), current.variable);
      }
    }
  } else if (current.degree() === 1) {
    const root = current.get(0).neg().div(current.get(1));
    factors.push(root);
    current = new Poly(new Map([[0, current.get(1)]]), current.variable);
  }

  if (factors.length === 0) {
    return {
      ok: false,
      error: 'No whole-number or simple fractional roots found, so this one doesn’t factorise neatly. Try the quadratic formula if it’s a quadratic.',
    };
  }

  const lead = current.degree() === 0 ? current.get(0) : Rational.int(1);
  const leadPart = lead.eq(Rational.int(1)) ? '' : rl(lead);
  const remainder = current.degree() > 0 ? `\\left(${polyLatex(current)}\\right)` : '';
  const factored = `${leadPart}${factors.map(factorLatex).join('')}${remainder}`;

  steps.push({ note: 'Put the factors together.', latex: `P(x) = ${factored}`, annotation: 'fully factorised' });
  steps.push({
    note: 'Setting each factor to zero gives the roots.',
    latex: factors.map((f) => `x = ${rl(f)}`).join(', \\quad '),
  });

  return {
    ok: true,
    solution: {
      headline: `Factorise $${original}$`,
      methodName: 'Factor theorem',
      steps,
      answerLatex: `P(x) = ${factored}`,
    },
  };
}

/* -------------------------------------------------------------- division */
function byDivision(p: Poly, a: Rational): SolveResult {
  const { quotient, remainder } = syntheticDivide(p, a);
  const steps: Step[] = [
    { note: 'Write down the polynomial and the divisor.', latex: `P(x) = ${polyLatex(p)} \\quad \\div \\quad ${factorLatex(a)}` },
    {
      note: `Use synthetic division with $x = ${rl(a)}$: bring down the leading coefficient, multiply, add, and repeat.`,
      latex: `\\text{coefficients: } ${[...Array(p.degree() + 1)].map((_, i) => rl(p.get(p.degree() - i))).join(', \\; ')}`,
    },
    { note: 'The result is the quotient, with the last number as the remainder.', latex: `\\text{Quotient} = ${polyLatex(quotient)}, \\quad \\text{Remainder} = ${rl(remainder)}` },
    {
      note: 'Write it in division form.',
      latex: remainder.isZero()
        ? `${polyLatex(p)} = ${factorLatex(a)}\\left(${polyLatex(quotient)}\\right)`
        : `\\dfrac{${polyLatex(p)}}{${factorLatex(a).slice(1, -1)}} = ${polyLatex(quotient)} + \\dfrac{${rl(remainder)}}{${factorLatex(a).slice(1, -1)}}`,
      annotation: remainder.isZero() ? 'divides exactly' : `remainder ${rlPlain(remainder)}`,
    },
  ];
  return {
    ok: true,
    solution: {
      headline: `Divide $${polyLatex(p)}$ by $${factorLatex(a).slice(1, -1)}$`,
      methodName: 'Synthetic division',
      steps,
      answerLatex: `${polyLatex(quotient)}${remainder.isZero() ? '' : ` + \\dfrac{${rl(remainder)}}{${factorLatex(a).slice(1, -1)}}`}`,
    },
  };
}

/* ------------------------------------------------------ remainder theorem */
function byRemainder(p: Poly, a: Rational): SolveResult {
  const value = evaluate(p, a);
  const steps: Step[] = [
    { note: 'The remainder theorem: dividing $P(x)$ by $(x - a)$ leaves a remainder of $P(a)$.', latex: `P(x) = ${polyLatex(p)}` },
    {
      note: `So substitute $x = ${rl(a)}$ — no division needed.`,
      latex: p
        .terms()
        .map(({ power, coeff }) => `${rl(coeff)}${power === 0 ? '' : `(${rl(a)})^{${power}}`}`)
        .join(' + ')
        .replace(/\+ -/g, '- '),
    },
    {
      note: 'Work it out.',
      latex: `P(${rl(a)}) = ${rl(value)}`,
      annotation: value.isZero() ? 'zero → it is a factor' : 'the remainder',
    },
  ];
  return {
    ok: true,
    solution: {
      headline: `Find the remainder when $${polyLatex(p)}$ is divided by $${factorLatex(a).slice(1, -1)}$`,
      methodName: 'Remainder theorem',
      steps,
      answerLatex: `P(${rl(a)}) = ${rl(value)}`,
    },
  };
}

function parseInput(input: string): { poly: Poly; root: Rational | null } {
  const cleaned = input.replace(/factorise|factorize|factor|divide|remainder/gi, '').trim();
  const split = splitDivision(cleaned);
  if (split) return { poly: parsePoly(split.dividend, 'x'), root: split.root };
  return { poly: parsePoly(cleaned, 'x'), root: null };
}

export const polynomialsSolver: Solver = {
  id: 'polynomials',
  title: 'Polynomials',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Factorise cubics, divide polynomials, and use the remainder theorem.',
  placeholder: 'e.g.  x^3 - 2x^2 - 5x + 6',
  methods: [
    { id: 'factor-theorem', name: 'Factor theorem', blurb: 'Test possible roots, then divide out each factor until it’s fully factorised.' },
    { id: 'division', name: 'Division', blurb: 'Synthetic division of P(x) by a linear factor, giving quotient and remainder.' },
    { id: 'remainder', name: 'Remainder theorem', blurb: 'The remainder on dividing by (x − a) is just P(a) — no long division.' },
  ],
  defaultMethodId: 'factor-theorem',
  detect(input) {
    if (/d\/dx|∫|integrate|differentiate/i.test(input)) return 0;
    if (/[;\n]/.test(input) || /[yY]/.test(input)) return 0;
    const explicit = /factorise|factorize|remainder|divide|polynomial/i.test(input);
    try {
      const { poly, root } = parseInput(input);
      if (poly.degree() < 3) return explicit && poly.degree() >= 2 ? 0.85 : 0;
      return root !== null || explicit ? 0.95 : 0.88;
    } catch {
      return 0;
    }
  },
  solve(input, methodId): SolveResult {
    let parsed: { poly: Poly; root: Rational | null };
    try {
      parsed = parseInput(input);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof ParseError ? e.message : 'Could not read that polynomial. Try  x^3 - 2x^2 - 5x + 6.',
      };
    }
    const { poly, root } = parsed;
    if (poly.isZeroPoly()) return { ok: false, error: 'Enter a polynomial, e.g.  x^3 - 2x^2 - 5x + 6.' };

    const wantsRemainder = /remainder/i.test(input) || methodId === 'remainder';
    const wantsDivision = methodId === 'division' || (root !== null && !wantsRemainder);

    if (root !== null && wantsRemainder) return byRemainder(poly, root);
    if (root !== null && wantsDivision) return byDivision(poly, root);
    if (root === null && (wantsRemainder || methodId === 'division')) {
      return { ok: false, error: 'Say what to divide by, e.g.  x^3 - 2x^2 - 5x + 6 ÷ (x - 1).' };
    }
    return byFactorTheorem(poly);
  },
};
