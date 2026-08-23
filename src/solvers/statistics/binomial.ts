import {
  parseExpr,
  evaluateExpr,
  toLatex,
  type Expr,
} from '../../lib/math/expr';
import { exprToPolyFrac, ExpandError } from '../../lib/math/expand';
import { polyLatex } from '../../lib/math/format';
import { Rational } from '../../lib/math/rational';
import { Poly } from '../../lib/math/parse';
import type { Solver, SolveResult, Step } from '../../lib/engine/types';

/**
 * Binomial expansion (SACE Stage 1 Mathematics / Mathematical Methods).
 *
 * This deliberately handles a polynomial base rather than only `(a+b)^n`:
 * the same theorem also covers `(2x-3)^4`, while the exact polynomial engine
 * keeps every coefficient rational and avoids floating-point drift.
 */
const MAX_POWER = 20;

function clean(input: string): string {
  return input
    .replace(/\b(?:expand|binomial|theorem|brackets?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function read(input: string): { base: Expr; power: number } {
  const expression = clean(input).replace(/^\((.*)\)$/, '$1');
  const parsed = parseExpr(expression);
  if (parsed.t !== 'pow')
    throw new Error('Write a binomial expression like (x + 2)^3.');
  const power = evaluateExpr(parsed.b);
  if (!Number.isSafeInteger(power) || power < 0 || power > MAX_POWER)
    throw new Error(`The power must be a whole number from 0 to ${MAX_POWER}.`);
  return { base: parsed.a, power };
}

export const binomialSolver: Solver = {
  id: 'binomial',
  title: 'Binomial expansion',
  subjects: ['Methods'],
  blurb:
    'Expand powers of a binomial using coefficients from Pascal’s triangle.',
  placeholder: 'e.g.  expand (x + 2)^3',
  methods: [
    {
      id: 'theorem',
      name: 'Binomial theorem',
      blurb: 'Use \\binom{n}{r}a^{n-r}b^r to expand each term exactly.',
    },
  ],
  defaultMethodId: 'theorem',
  detect(input) {
    if (/=/.test(input)) return 0;
    if (!/\^\s*(?:\d+|\{\s*\d+\s*\})/.test(input)) return 0;
    if (!/\(|\bexpand\b|\bbinomial\b/i.test(input)) return 0;
    try {
      read(input);
      return 0.96;
    } catch {
      return 0;
    }
  },
  solve(input): SolveResult {
    let q: { base: Expr; power: number };
    try {
      q = read(input);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Could not read that binomial.',
      };
    }

    const { base, power } = q;
    let fraction;
    try {
      fraction = exprToPolyFrac(base, 'x');
      if (fraction.den.degree() !== 0)
        throw new ExpandError('The binomial must not have x in a denominator.');
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error ? e.message : 'That is not a polynomial binomial.',
      };
    }

    let poly: Poly;
    try {
      const denominator = fraction.den.get(0);
      const basePoly = fraction.num.scale(Rational.int(1).div(denominator));
      let expanded = new Map<number, Rational>([[0, Rational.int(1)]]);
      for (let i = 0; i < power; i++) {
        const next = new Map<number, Rational>();
        for (const [p, a] of expanded) {
          for (const { power: qPower, coeff: b } of basePoly.terms()) {
            const key = p + qPower;
            next.set(key, (next.get(key) ?? Rational.int(0)).add(a.mul(b)));
          }
        }
        expanded = next;
      }
      poly = new Poly(expanded, 'x');
    } catch {
      return {
        ok: false,
        error:
          'That expansion has coefficients outside the exact arithmetic range.',
      };
    }
    const answer = polyLatex(poly);
    const baseLatex = toLatex(base);
    const steps: Step[] = [
      {
        note: 'Write the binomial theorem.',
        latex: `(a+b)^n = \\sum_{r=0}^{n} \\binom{n}{r}a^{n-r}b^r`,
      },
      {
        note: 'Substitute the binomial and its power.',
        latex: `(${baseLatex})^{${power}}`,
      },
      {
        note: 'Expand and collect like powers of x.',
        latex: `${baseLatex}^{${power}} = ${answer}`,
        annotation: 'expanded form',
      },
    ];
    return {
      ok: true,
      solution: {
        headline: `Expand $(${baseLatex})^{${power}}$`,
        methodName: 'Binomial theorem',
        steps,
        answerLatex: answer,
      },
    };
  },
};
