import { Rational } from '../../lib/math/rational';
import { parsePoly, Poly, ParseError } from '../../lib/math/parse';
import { polyLatex } from '../../lib/math/format';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/** Pull out definite-integral limits written as "from a to b" or "_a^b". */
function readLimits(input: string): { lower: number; upper: number } | null {
  const words = input.match(/from\s*(-?\d*\.?\d+)\s*to\s*(-?\d*\.?\d+)/i);
  if (words) return { lower: Number(words[1]), upper: Number(words[2]) };
  const sub = input.match(/_\s*\{?(-?\d*\.?\d+)\}?\s*\^\s*\{?(-?\d*\.?\d+)\}?/);
  if (sub) return { lower: Number(sub[1]), upper: Number(sub[2]) };
  return null;
}

function cleanIntegrand(input: string): string {
  return (
    input
      .replace(/from\s*-?\d*\.?\d+\s*to\s*-?\d*\.?\d+/gi, ' ')
      .replace(/_\s*\{?-?\d*\.?\d+\}?\s*\^\s*\{?-?\d*\.?\d+\}?/g, ' ')
      // Whole words first: stripping "int" early would leave "egrate" behind.
      .replace(/\bintegrate\b|\bintegral\b|\bantiderivative\b|\bof\b/gi, ' ')
      .replace(/\\int/gi, ' ')
      .replace(/∫/g, ' ')
      .replace(/d\s*x\s*$/i, '')
      .trim()
  );
}

function parseIntegrand(input: string): Poly {
  const poly = parsePoly(cleanIntegrand(input), 'x');
  if (poly.isZeroPoly()) throw new ParseError('Enter a function of x to integrate, e.g.  3x^2 + 2x - 5');
  return poly;
}

/** Antiderivative of a polynomial (constant of integration handled separately). */
export function integrate(poly: Poly): Poly {
  const m = new Map<number, Rational>();
  for (const { power, coeff } of poly.terms()) {
    m.set(power + 1, coeff.div(Rational.int(power + 1)));
  }
  return new Poly(m, poly.variable);
}

function frac(c: Rational): string {
  return c.isInt() ? String(c.n) : `${c.n < 0 ? '-' : ''}\\frac{${Math.abs(c.n)}}{${c.d}}`;
}
function mono(coeff: Rational, power: number): string {
  if (power === 0) return frac(coeff);
  const c = coeff.eq(Rational.int(1)) ? '' : coeff.eq(Rational.int(-1)) ? '-' : frac(coeff);
  return `${c}${power === 1 ? 'x' : `x^{${power}}`}`;
}

export const integrationSolver: Solver = {
  id: 'integrate',
  title: 'Integration',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Find the indefinite integral of a polynomial.',
  placeholder: 'e.g.  3x^2 + 2x - 5',
  methods: [
    { id: 'reverse-power', name: 'Reverse power rule', blurb: 'Add one to the power and divide by the new power. Don’t forget + C.' },
    { id: 'definite', name: 'Definite integral', blurb: 'Integrate, then evaluate F(b) − F(a) — the area under the curve.' },
  ],
  defaultMethodId: 'reverse-power',
  detect(input) {
    if (/d\/dx|dy\/dx|differentiate|derivative/i.test(input)) return 0;
    return /∫|\bintegrate\b|\bantiderivative\b|dx\s*$/i.test(input) ? 0.97 : 0;
  },
  solve(input): SolveResult {
    let poly: Poly;
    try {
      poly = parseIntegrand(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that function.' };
    }

    const anti = integrate(poly);
    const steps: Step[] = [
      { note: 'Write the integral.', latex: `\\int \\left(${polyLatex(poly)}\\right)\\,dx` },
      {
        note: 'Integrate each term: add one to the power, then divide by the new power.',
        latex: `\\int ax^{n}\\,dx = \\frac{a}{n+1}\\,x^{\\,n+1} + C`,
      },
    ];

    for (const { power, coeff } of poly.terms()) {
      const nc = coeff.div(Rational.int(power + 1));
      steps.push({
        note: `Raise the power to ${power + 1} and divide by ${power + 1}.`,
        latex: `\\int ${mono(coeff, power)}\\,dx = ${mono(nc, power + 1)}`,
      });
    }

    const body = anti.isZeroPoly() ? '' : polyLatex(anti);
    const limits = readLimits(input);

    // Definite integral: evaluate the antiderivative between the limits.
    if (limits) {
      const { lower, upper } = limits;
      const at = (x: number): number => {
        let total = 0;
        for (const { power, coeff } of anti.terms()) total += coeff.toNumber() * Math.pow(x, power);
        return total;
      };
      const upperVal = at(upper);
      const lowerVal = at(lower);
      const area = upperVal - lowerVal;

      steps.push({
        note: 'For a definite integral the constant cancels, so write the antiderivative in square brackets with the limits.',
        latex: `\\int_{${lower}}^{${upper}} \\left(${polyLatex(poly)}\\right) dx = \\Big[\\, ${body} \\,\\Big]_{${lower}}^{${upper}}`,
      });
      steps.push({
        note: 'Substitute the upper limit, then the lower limit, and subtract.',
        latex: `= \\left(${body.replace(/x/g, `(${upper})`)}\\right) - \\left(${body.replace(/x/g, `(${lower})`)}\\right)`,
      });
      steps.push({
        note: 'Work out each part.',
        latex: `= ${fmtNum(upperVal)} - \\left(${fmtNum(lowerVal)}\\right) = ${fmtNum(area)}`,
        annotation: 'signed area under the curve',
      });

      return {
        ok: true,
        solution: {
          headline: `Evaluate $\\int_{${lower}}^{${upper}} ${polyLatex(poly)} \\; dx$`,
          methodName: 'Definite integral',
          steps,
          answerLatex: fmtNum(area),
        },
      };
    }

    const answerLatex = `${body}${body ? ' + ' : ''}C`;
    steps.push({
      note: 'Add the constant of integration.',
      latex: `= ${answerLatex}`,
      annotation: '+ C matters!',
    });

    return {
      ok: true,
      solution: {
        headline: `Integrate $${polyLatex(poly)}$`,
        methodName: 'Reverse power rule',
        steps,
        answerLatex,
      },
    };
  },
};

/** Tidy decimal, avoiding "-0" and long floating-point tails. */
function fmtNum(x: number): string {
  const r = Math.round(x * 1e9) / 1e9;
  return Object.is(r, -0) ? '0' : String(r);
}
