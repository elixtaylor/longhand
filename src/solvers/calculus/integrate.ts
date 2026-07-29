import { Rational } from '../../lib/math/rational';
import { parsePoly, Poly, ParseError } from '../../lib/math/parse';
import { polyLatex } from '../../lib/math/format';
import { parseExpr, evaluateExpr } from '../../lib/math/expr';
import { exprToPolyFrac } from '../../lib/math/expand';
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
  if (poly.isZeroPoly())
    throw new ParseError(
      'Enter a function of x to integrate, e.g.  3x^2 + 2x - 5',
    );
  return poly;
}

interface AffinePower {
  a: number;
  b: number;
  power: number;
}

/** Read the common substitution form ∫(ax+b)^n dx exactly. */
function readAffinePower(input: string): AffinePower | null {
  try {
    const expression = cleanIntegrand(input);
    const parsed = parseExpr(expression);
    if (parsed.t !== 'pow') return null;
    const power = evaluateExpr(parsed.b);
    if (!Number.isSafeInteger(power) || power < 0) return null;
    const fraction = exprToPolyFrac(parsed.a, 'x');
    if (fraction.den.degree() !== 0 || fraction.num.degree() !== 1) return null;
    const denominator = fraction.den.get(0).toNumber();
    const a = fraction.num.get(1).toNumber() / denominator;
    const b = fraction.num.get(0).toNumber() / denominator;
    if (!Number.isFinite(a) || a === 0 || !Number.isFinite(b)) return null;
    return { a, b, power };
  } catch {
    return null;
  }
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
  return c.isInt()
    ? String(c.n)
    : `${c.n < 0 ? '-' : ''}\\frac{${Math.abs(c.n)}}{${c.d}}`;
}
function mono(coeff: Rational, power: number): string {
  if (power === 0) return frac(coeff);
  const c = coeff.eq(Rational.int(1))
    ? ''
    : coeff.eq(Rational.int(-1))
      ? '-'
      : frac(coeff);
  return `${c}${power === 1 ? 'x' : `x^{${power}}`}`;
}

export const integrationSolver: Solver = {
  id: 'integrate',
  title: 'Integration',
  subjects: ['Methods', 'Specialist'],
  blurb:
    'Find polynomial antiderivatives, definite areas, and affine substitutions.',
  placeholder: 'e.g.  3x^2 + 2x - 5',
  methods: [
    {
      id: 'reverse-power',
      name: 'Reverse power rule',
      blurb:
        'Add one to the power and divide by the new power. Don’t forget + C.',
    },
    {
      id: 'definite',
      name: 'Definite integral',
      blurb: 'Integrate, then evaluate F(b) − F(a) — the area under the curve.',
    },
    {
      id: 'substitution',
      name: 'Substitution',
      blurb: 'Let u = ax + b, then integrate the resulting power of u.',
    },
  ],
  defaultMethodId: 'reverse-power',
  detect(input) {
    if (/d\/dx|dy\/dx|differentiate|derivative/i.test(input)) return 0;
    return /∫|\bintegrate\b|\bantiderivative\b|dx\s*$/i.test(input) ? 0.97 : 0;
  },
  solve(input): SolveResult {
    const affine = readAffinePower(input);
    if (affine) return solveAffinePower(input, affine);

    let poly: Poly;
    try {
      poly = parseIntegrand(input);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Could not read that function.',
      };
    }

    const anti = integrate(poly);
    const steps: Step[] = [
      {
        note: 'Write the integral.',
        latex: `\\int \\left(${polyLatex(poly)}\\right)\\,dx`,
      },
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
        for (const { power, coeff } of anti.terms())
          total += coeff.toNumber() * Math.pow(x, power);
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

function solveAffinePower(input: string, q: AffinePower): SolveResult {
  const { a, b, power } = q;
  const limits = readLimits(input);
  const baseLatex = `(${polyLatex(
    new Poly(
      new Map([
        [1, Rational.fromDecimal(a)],
        [0, Rational.fromDecimal(b)],
      ]),
      'x',
    ),
  )})`;
  const antiderivative =
    power === -1 ? null : `(u^{${power + 1}})/(${fmtNum(a * (power + 1))})`;
  if (!antiderivative)
    return {
      ok: false,
      error: 'This substitution form needs a non-negative whole-number power.',
    };

  const steps: Step[] = [
    {
      note: 'Choose the repeated inner expression as u.',
      latex: `u = ${baseLatex}`,
    },
    {
      note: 'Differentiate the substitution.',
      latex: `du = ${fmtNum(a)}\\,dx \\Rightarrow dx = \\dfrac{du}{${fmtNum(a)}}`,
    },
    {
      note: 'Rewrite the integral in terms of u and apply the reverse power rule.',
      latex: `\\int u^{${power}}\\,\\dfrac{du}{${fmtNum(a)}} = \\dfrac{u^{${power + 1}}}{${fmtNum(a * (power + 1))}} + C`,
    },
  ];

  if (limits) {
    const valueAt = (x: number) =>
      Math.pow(a * x + b, power + 1) / (a * (power + 1));
    const upper = valueAt(limits.upper);
    const lower = valueAt(limits.lower);
    const value = upper - lower;
    steps.push({
      note: 'Substitute the limits into the antiderivative; the constant cancels.',
      latex: `\\left[\\dfrac{(${fmtNum(a)}x ${b < 0 ? '-' : '+'} ${fmtNum(Math.abs(b))})^{${power + 1}}}{${fmtNum(a * (power + 1))}}\\right]_${limits.lower}^{${limits.upper}} = ${fmtNum(value)}`,
      annotation: 'definite integral',
    });
    return {
      ok: true,
      solution: {
        headline: `Evaluate the definite integral`,
        methodName: 'Substitution',
        steps,
        answerLatex: fmtNum(value),
      },
    };
  }

  const answer = `\\dfrac{(${fmtNum(a)}x ${b < 0 ? '-' : '+'} ${fmtNum(Math.abs(b))})^{${power + 1}}}{${fmtNum(a * (power + 1))}} + C`;
  steps.push({
    note: 'Substitute u back in and add the constant of integration.',
    latex: `= ${answer}`,
    annotation: '+ C matters!',
  });
  return {
    ok: true,
    solution: {
      headline: `Integrate $${baseLatex}^{${power}}$`,
      methodName: 'Substitution',
      steps,
      answerLatex: answer,
    },
  };
}

/** Tidy decimal, avoiding "-0" and long floating-point tails. */
function fmtNum(x: number): string {
  const r = Math.round(x * 1e9) / 1e9;
  return Object.is(r, -0) ? '0' : String(r);
}
