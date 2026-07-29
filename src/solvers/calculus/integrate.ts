import { Rational } from '../../lib/math/rational';
import { parsePoly, Poly, ParseError } from '../../lib/math/parse';
import { polyLatex } from '../../lib/math/format';
import { parseExpr, evaluateExpr } from '../../lib/math/expr';
import { exprToPolyFrac } from '../../lib/math/expand';
import { realRoots } from '../../lib/math/roots';
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

interface ByPartsInput {
  power: number;
  functionName: 'exp' | 'sin' | 'cos';
}

interface BasicIntegral {
  coefficient: number;
  functionName:
    | 'sin'
    | 'cos'
    | 'exp'
    | 'sec2'
    | 'reciprocal'
    | 'tan'
    | 'sin2'
    | 'cos2'
    | 'sincos'
    | 'atan'
    | 'asin';
}

interface IntegrationApplication {
  kind: 'area' | 'volume';
  first: Poly;
  second?: Poly;
  lower: number;
  upper: number;
  axis?: 'x' | 'y';
}

function polynomialValue(poly: Poly, x: number): number {
  let total = 0;
  for (const { power, coeff } of poly.terms())
    total += coeff.toNumber() * Math.pow(x, power);
  return total;
}

function areaUnder(poly: Poly, lower: number, upper: number): number {
  const anti = integrate(poly);
  return polynomialValue(anti, upper) - polynomialValue(anti, lower);
}

function parseApplicationPoly(raw: string): Poly {
  const cleaned = raw
    .replace(/^\s*y\s*=\s*/i, '')
    .replace(
      /\b(?:the|curve|function|graph|area|region|volume|solid|of|revolution|rotated|about|axis)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/, '')
    .trim();
  return parsePoly(cleaned.replace(/^\s*=?\s*/, ''), 'x');
}

/** Read the common SACE area-between-curves and volume-of-revolution forms. */
function readApplication(input: string): IntegrationApplication | null {
  const limits = input.match(
    /\bfrom\s*(-?\d*\.?\d+)\s*(?:to|and)\s*(-?\d*\.?\d+)/i,
  );
  if (!limits) return null;
  const lower = Number(limits[1]);
  const upper = Number(limits[2]);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper)
    return null;

  if (/area\s+between|area\s+enclosed|region\s+between/i.test(input)) {
    const between = input.match(
      /\bbetween\s+(?:y\s*=\s*)?(.+?)\s+and\s+(?:y\s*=\s*)?(.+?)\s+from\s*-?\d/i,
    );
    if (!between) return null;
    try {
      return {
        kind: 'area',
        first: parseApplicationPoly(between[1]),
        second: parseApplicationPoly(between[2]),
        lower,
        upper,
      };
    } catch {
      return null;
    }
  }

  if (
    /volume\s+of\s+revolution|solid\s+of\s+revolution|volume.*about/i.test(
      input,
    )
  ) {
    const functionMatch = input.match(
      /(?:volume\s+of\s+revolution|solid\s+of\s+revolution|volume)\s+(?:of\s+)?(?:y\s*=\s*)?(.+?)\s+from\s*-?\d/i,
    );
    if (!functionMatch) return null;
    const axis = input.match(/about\s+(?:the\s+)?([xy])-?axis/i)?.[1] as
      'x' | 'y' | undefined;
    try {
      return {
        kind: 'volume',
        first: parseApplicationPoly(functionMatch[1]),
        lower,
        upper,
        axis,
      };
    } catch {
      return null;
    }
  }
  return null;
}

function solveAreaApplication(q: IntegrationApplication): SolveResult {
  const top = q.first;
  const bottom = q.second!;
  const difference = top.sub(bottom);
  const roots = realRoots(difference).filter(
    (x) => x > q.lower + 1e-9 && x < q.upper - 1e-9,
  );
  const cuts = [q.lower, ...roots.sort((a, b) => a - b), q.upper];
  const pieces = cuts
    .slice(0, -1)
    .map((a, i) => Math.abs(areaUnder(difference, a, cuts[i + 1])));
  const area = pieces.reduce((sum, value) => sum + value, 0);
  const splitNote = roots.length
    ? `Split at the intersection points ${roots.map((x) => fmtNum(x)).join(', ')}.`
    : 'The curves do not cross inside the interval, so one integral is enough.';
  return {
    ok: true,
    solution: {
      headline: `Area between $${polyLatex(top)}$ and $${polyLatex(bottom)}$`,
      methodName: 'Area between curves',
      steps: [
        {
          note: 'Find the vertical difference between the curves.',
          latex: `f(x) - g(x) = ${polyLatex(difference)}`,
        },
        {
          note: splitNote,
          latex: `A = \\int_{${fmtNum(q.lower)}}^{${fmtNum(q.upper)}} |f(x)-g(x)|\\,dx`,
        },
        {
          note: 'Integrate the difference on each interval and add the positive areas.',
          latex: `A = ${pieces.map((v) => fmtNum(v)).join(' + ')} = ${fmtNum(area)}`,
          annotation: 'area',
        },
      ],
      answerLatex: `A = ${fmtNum(area)}\\text{ square units}`,
    },
  };
}

function solveVolumeApplication(q: IntegrationApplication): SolveResult {
  if (q.axis === 'y')
    return {
      ok: false,
      error:
        'This calculator currently uses washers about the x-axis. Rewrite the curve as x = f(y) for a y-axis rotation.',
    };
  const square = q.first.mul(q.first);
  const integral = areaUnder(square, q.lower, q.upper);
  const volume = Math.PI * integral;
  return {
    ok: true,
    solution: {
      headline: `Volume of revolution of $${polyLatex(q.first)}$`,
      methodName: 'Volume of revolution',
      steps: [
        {
          note: 'A rotation about the x-axis makes circular washers with radius f(x).',
          latex: `V = \\pi \\int_{${fmtNum(q.lower)}}^{${fmtNum(q.upper)}} [f(x)]^2\\,dx`,
        },
        {
          note: 'Square the radius function.',
          latex: `[f(x)]^2 = ${polyLatex(square)}`,
        },
        {
          note: 'Integrate and multiply by π.',
          latex: `V = \\pi \\times ${fmtNum(integral)} = ${fmtNum(volume)}`,
          annotation: 'volume',
        },
      ],
      answerLatex: `V = ${fmtNum(volume)}\\text{ cubic units}`,
    },
  };
}

/** Read the standard SACE examples x^n e^x, x sin x, and x cos x. */
function readByParts(input: string): ByPartsInput | null {
  const expression = cleanIntegrand(input).replace(/\s+/g, '');
  const match = expression.match(
    /^x(?:\^(\d+))?(?:\*|)?(exp\(x\)|e\^x|sin\(x\)|cos\(x\)|sinx|cosx)$/i,
  );
  if (!match) return null;
  const power = Number(match[1] ?? 1);
  const rawName = match[2].toLowerCase();
  const functionName: ByPartsInput['functionName'] = rawName.startsWith('e')
    ? 'exp'
    : rawName.startsWith('sin')
      ? 'sin'
      : 'cos';
  if (!Number.isSafeInteger(power) || power < 1 || power > 4) return null;
  return { power, functionName };
}

/** Read the elementary non-polynomial integrals used before substitution. */
function readBasicIntegral(input: string): BasicIntegral | null {
  const expression = cleanIntegrand(input)
    .replace(/\s+/g, '')
    .replace(/^\((.*)\)$/s, '$1');
  const match = expression.match(
    /^([+-]?(?:\d*\.?\d+)?)?(sin|cos|tan|exp|sec\^2)(?:\(x\)|x)$/i,
  );
  if (match) {
    const raw = match[1];
    const coefficient =
      raw === undefined || raw === '' || raw === '+'
        ? 1
        : raw === '-'
          ? -1
          : Number(raw);
    if (!Number.isFinite(coefficient)) return null;
    return {
      coefficient,
      functionName:
        match[2].toLowerCase() === 'sec^2'
          ? 'sec2'
          : (match[2].toLowerCase() as BasicIntegral['functionName']),
    };
  }
  const identity = expression.match(
    /^([+-]?(?:\d*\.?\d+)?)?(sin\^2x|cos\^2x|sinxcosx)$/i,
  );
  if (identity) {
    const raw = identity[1];
    const coefficient =
      raw === undefined || raw === '' || raw === '+'
        ? 1
        : raw === '-'
          ? -1
          : Number(raw);
    if (!Number.isFinite(coefficient)) return null;
    return {
      coefficient,
      functionName:
        identity[2].toLowerCase() === 'sin^2x'
          ? 'sin2'
          : identity[2].toLowerCase() === 'cos^2x'
            ? 'cos2'
            : 'sincos',
    };
  }
  if (/^1\/(?:1\+x\^2|\(1\+x\^2\))$/i.test(expression))
    return { coefficient: 1, functionName: 'atan' };
  if (/^1\/sqrt\(1-x\^2\)$/i.test(expression))
    return { coefficient: 1, functionName: 'asin' };
  if (/^(?:1\/x|x\^-1)$/i.test(expression))
    return { coefficient: 1, functionName: 'reciprocal' };
  return null;
}

function solveBasicIntegral(q: BasicIntegral): SolveResult {
  const coefficient = fmtNum(q.coefficient);
  const signed = q.coefficient === 1 ? '' : `${coefficient}`;
  const fn = q.functionName;
  let answer: string;
  let integrand: string;
  let rule: string;
  if (fn === 'sin') {
    integrand = `${signed}\\sin x`;
    answer = `${q.coefficient === -1 ? '' : coefficient === '1' ? '-' : `-${coefficient}`}\\cos x + C`;
    rule = '\\int \\sin x\\,dx = -\\cos x + C';
  } else if (fn === 'cos') {
    integrand = `${signed}\\cos x`;
    answer = `${q.coefficient === 1 ? '' : coefficient}\\sin x + C`;
    rule = '\\int \\cos x\\,dx = \\sin x + C';
  } else if (fn === 'exp') {
    integrand = `${signed}e^x`;
    answer = `${q.coefficient === 1 ? '' : coefficient}e^x + C`;
    rule = '\\int e^x\\,dx = e^x + C';
  } else if (fn === 'sec2') {
    integrand = `${signed}\\sec^2 x`;
    answer = `${q.coefficient === 1 ? '' : coefficient}\\tan x + C`;
    rule = '\\int \\sec^2 x\\,dx = \\tan x + C';
  } else if (fn === 'tan') {
    integrand = `${signed}\\tan x`;
    answer = `${q.coefficient === 1 ? '-' : `-${coefficient}`}\\ln|\\cos x| + C`;
    rule = '\\int \\tan x\\,dx = -\\ln|\\cos x| + C';
  } else if (fn === 'sin2') {
    integrand = `${signed}\\sin^2 x`;
    answer = `${q.coefficient === 1 ? '' : `${coefficient}`}\\left(\\dfrac{x}{2} - \\dfrac{\\sin 2x}{4}\\right) + C`;
    rule = '\\sin^2 x = \\dfrac{1 - \\cos 2x}{2}';
  } else if (fn === 'cos2') {
    integrand = `${signed}\\cos^2 x`;
    answer = `${q.coefficient === 1 ? '' : `${coefficient}`}\\left(\\dfrac{x}{2} + \\dfrac{\\sin 2x}{4}\\right) + C`;
    rule = '\\cos^2 x = \\dfrac{1 + \\cos 2x}{2}';
  } else if (fn === 'sincos') {
    integrand = `${signed}\\sin x\\cos x`;
    answer = `${q.coefficient === 1 ? '' : `${coefficient}`}\\dfrac{\\sin^2 x}{2} + C`;
    rule = '\\int \\sin x\\cos x\\,dx = \\dfrac{\\sin^2 x}{2} + C';
  } else if (fn === 'atan') {
    integrand = '\\dfrac{1}{1+x^2}';
    answer = '\\arctan x + C';
    rule = '\\int \\dfrac{1}{1+x^2}\\,dx = \\arctan x + C';
  } else if (fn === 'asin') {
    integrand = '\\dfrac{1}{\\sqrt{1-x^2}}';
    answer = '\\arcsin x + C';
    rule = '\\int \\dfrac{1}{\\sqrt{1-x^2}}\\,dx = \\arcsin x + C';
  } else {
    integrand = '\\dfrac{1}{x}';
    answer = '\\ln|x| + C';
    rule = '\\int \\dfrac{1}{x}\\,dx = \\ln|x| + C';
  }
  return {
    ok: true,
    solution: {
      headline: `Integrate $${integrand}$`,
      methodName: 'Basic function integrals',
      steps: [
        { note: 'Recognise the standard antiderivative.', latex: rule },
        {
          note: 'Keep the constant multiplier and add the constant of integration.',
          latex: `\\int ${integrand}\\,dx = ${answer}`,
          annotation: '+ C matters!',
        },
      ],
      answerLatex: answer,
    },
  };
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
    'Find antiderivatives, areas between curves, volumes, substitutions, and parts.',
  placeholder: 'e.g.  3x^2 + 2x - 5   or   ∫ x exp(x) dx',
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
    {
      id: 'by-parts',
      name: 'Integration by parts',
      blurb: 'Choose u and dv, then use ∫u\,dv = uv − ∫v\,du.',
    },
    {
      id: 'basic-functions',
      name: 'Basic function integrals',
      blurb:
        'Use the standard antiderivatives for sin, cos, tan, sec², eˣ and 1/x.',
    },
    {
      id: 'area-between',
      name: 'Area between curves',
      blurb:
        'Integrate the positive difference between two curves over an interval.',
    },
    {
      id: 'volume-revolution',
      name: 'Volume of revolution',
      blurb:
        'Use washers to rotate a curve about the x-axis and find its volume.',
    },
  ],
  defaultMethodId: 'reverse-power',
  detect(input) {
    if (
      /area\s+between|area\s+enclosed|volume\s+of\s+revolution|solid\s+of\s+revolution/i.test(
        input,
      )
    )
      return 0.99;
    if (/d\/dx|dy\/dx|differentiate|derivative/i.test(input)) return 0;
    return /∫|\bintegrate\b|\bantiderivative\b|dx\s*$/i.test(input) ? 0.97 : 0;
  },
  solve(input): SolveResult {
    const application = readApplication(input);
    if (application)
      return application.kind === 'area'
        ? solveAreaApplication(application)
        : solveVolumeApplication(application);
    const byParts = readByParts(input);
    if (byParts) return solveByParts(byParts);
    const basic = readBasicIntegral(input);
    if (basic) return solveBasicIntegral(basic);
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

function solveByParts(q: ByPartsInput): SolveResult {
  const { power, functionName } = q;
  const fn = functionName === 'exp' ? 'e^x' : `\\${functionName}x`;
  const steps: Step[] = [
    {
      note: 'Choose the algebraic factor as u and the remaining factor as dv.',
      latex: `u = x^{${power}},\\quad dv = ${fn}\\,dx`,
    },
    {
      note: 'Differentiate u and integrate dv.',
      latex:
        functionName === 'exp'
          ? `du = ${power}x^{${power - 1}}\\,dx,\\quad v = e^x`
          : `du = ${power}x^{${power - 1}}\\,dx,\\quad v = ${functionName === 'sin' ? '-\\cos x' : '\\sin x'}`,
    },
    {
      note: 'Apply the integration-by-parts identity.',
      latex: `\\int u\\,dv = uv - \\int v\\,du`,
    },
  ];

  if (functionName === 'exp') {
    const terms: string[] = [];
    for (let k = 0; k <= power; k++) {
      const coefficient = factorialRatio(power, k);
      const sign = k % 2 === 0 ? '' : '-';
      const exponent = power - k;
      const xTerm =
        exponent === 0 ? '' : exponent === 1 ? 'x' : `x^{${exponent}}`;
      const coefficientText =
        exponent === 0 || coefficient !== 1 ? String(coefficient) : '';
      terms.push(`${sign}${coefficientText}${xTerm}`);
    }
    const body = terms.join(' + ').replace(/\+ -/g, '- ');
    steps.push({
      note: 'Repeat the same choice on the remaining polynomial–exponential integral until the power reaches zero.',
      latex: `\\int x^{${power}}e^x\\,dx = e^x\\left(${body}\\right) + C`,
      annotation: 'repeated parts',
    });
    const answer = `e^x\\left(${body}\\right) + C`;
    steps.push({
      note: 'Differentiate the result to check it returns the original integrand.',
      latex: `\\dfrac{d}{dx}\\left[${answer.replace(' + C', '')}\\right] = x^{${power}}e^x`,
      annotation: 'checked',
    });
    return {
      ok: true,
      solution: {
        headline: `Integrate $x^{${power}}e^x$`,
        methodName: 'Integration by parts',
        steps,
        answerLatex: answer,
      },
    };
  }

  if (power !== 1) {
    return {
      ok: false,
      error:
        'Integration by parts currently handles x sin x and x cos x; use a lower power or expand it first.',
    };
  }

  const answer =
    functionName === 'sin'
      ? '-x\\cos x + \\sin x + C'
      : 'x\\sin x + \\cos x + C';
  steps.push({
    note: 'Substitute u, v, and du into uv − ∫v du, then integrate the remaining basic trig function.',
    latex: `\\int x\\,\\${functionName}x\\,dx = ${answer}`,
  });
  steps.push({
    note: 'Differentiate the result to check it returns the original integrand.',
    latex: `\\dfrac{d}{dx}\left[${answer.replace(' + C', '')}\right] = x\\,\\${functionName}x`,
    annotation: 'checked',
  });
  return {
    ok: true,
    solution: {
      headline: `Integrate $x\\${functionName}x$`,
      methodName: 'Integration by parts',
      steps,
      answerLatex: answer,
    },
  };
}

function factorialRatio(n: number, k: number): number {
  let value = 1;
  for (let i = 0; i < k; i++) value *= n - i;
  return value;
}

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
