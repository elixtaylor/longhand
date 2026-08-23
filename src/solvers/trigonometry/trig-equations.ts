import { fmt, rad2deg } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/** Solve linear combinations of sin/cos/tan x over one revolution. */
type Fn = 'sin' | 'cos' | 'tan';

interface TrigEq {
  fn: Fn;
  coefficient: number;
  constant: number;
  k: number;
  radians: boolean;
  domain: {
    lower: number;
    upper: number;
    lowerInclusive: boolean;
    upperInclusive: boolean;
  };
}

const DEG = '^{\\circ}';
const RAD = '\\text{ rad}';

function radLatex(value: number): string {
  const ratio = value / Math.PI;
  const denominators = [1, 2, 3, 4, 6, 8, 12];
  for (const denominator of denominators) {
    const numerator = Math.round(ratio * denominator);
    if (Math.abs(ratio - numerator / denominator) < 1e-6) {
      if (numerator === 0) return '0';
      if (denominator === 1)
        return numerator === 1
          ? '\\pi'
          : numerator === -1
            ? '-\\pi'
            : `${numerator}\\pi`;
      if (numerator === 1) return `\\dfrac{\\pi}{${denominator}}`;
      if (numerator === -1) return `-\\dfrac{\\pi}{${denominator}}`;
      if (numerator < 0)
        return `-\\dfrac{${Math.abs(numerator)}\\pi}{${denominator}}`;
      return `\\dfrac{${numerator}\\pi}{${denominator}}`;
    }
  }
  return `${fmt(value, 6)}${RAD}`;
}

const ANGLE_TOKEN =
  '[-+]?(?:(?:\\d+(?:\\.\\d+)?)?\\s*(?:π|pi)(?:\\s*\\/\\s*\\d+(?:\\.\\d+)?)?|\\d+(?:\\.\\d+)?)';

function angleValue(raw: string): number | null {
  const token = raw.replace(/\s+/g, '').toLowerCase();
  if (!/π|pi/.test(token)) {
    const value = Number(token);
    return Number.isFinite(value) ? value : null;
  }
  const normal = token.replace(/π|pi/g, 'pi');
  const match = normal.match(
    /^([+-]?)(\d*(?:\.\d+)?)?pi(?:\/(\d+(?:\.\d+)?))?$/,
  );
  if (!match) return null;
  const sign = match[1] === '-' ? -1 : 1;
  const numerator =
    match[2] === '' || match[2] === undefined ? 1 : Number(match[2]);
  const denominator = match[3] === undefined ? 1 : Number(match[3]);
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  )
    return null;
  return (sign * numerator * Math.PI) / denominator;
}

function readDomain(input: string): {
  raw: string;
  lower: number;
  upper: number;
  lowerInclusive: boolean;
  upperInclusive: boolean;
} | null {
  const match = input.match(
    new RegExp(
      '(' +
        ANGLE_TOKEN +
        ')\\s*(<=|≤|<)\\s*x\\s*(<=|≤|<)\\s*(' +
        ANGLE_TOKEN +
        ')',
      'i',
    ),
  );
  if (!match) return null;
  const lower = angleValue(match[1]);
  const upper = angleValue(match[4]);
  if (
    lower === null ||
    upper === null ||
    !Number.isFinite(lower) ||
    !Number.isFinite(upper) ||
    lower > upper
  )
    return null;
  return {
    raw: match[0],
    lower,
    upper,
    lowerInclusive: match[2] !== '<',
    upperInclusive: match[3] !== '<',
  };
}

function parse(input: string): TrigEq {
  const statedDomain = readDomain(input);
  const radians = /\b(?:rad|radian|radians)\b|π|\bpi\b/i.test(input);
  const source = statedDomain ? input.replace(statedDomain.raw, ' ') : input;
  const s = source
    .replace(/\b(?:rad|radian|radians|deg|degree|degrees)\b/gi, '')
    .replace(/°/g, '')
    .replace(/\s+/g, '')
    .replace(/^[,;]+|[,;]+$/g, '')
    .toLowerCase();
  // Read the common mixed form a·f(x) + b = c as well as the already
  // isolated f(x) = k. Solving the linear outside layer first is the small
  // algebra/trigonometry overlap students are expected to show.
  const m = s.match(
    /^([+-]?(?:\d*\.?\d+)?)(sin|cos|tan)\(?x\)?(?:([+-])(\d*\.?\d+))?=(-?\d*\.?\d+)$/,
  );
  if (!m) {
    throw new Error(
      'Write it like  sin x = 0.5  or  2sin x + 1 = 2  (sin, cos or tan).',
    );
  }
  const coefficient =
    m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : Number(m[1]);
  const constant = m[3] ? Number(`${m[3]}${m[4]}`) : 0;
  const rhs = Number(m[5]);
  if (!Number.isFinite(coefficient) || coefficient === 0)
    throw new Error('The multiplier of the trig function cannot be zero.');
  const k = (rhs - constant) / coefficient;
  if (!Number.isFinite(k))
    throw new Error(
      'Those values produce a result outside the calculator’s numeric range.',
    );
  const revolution = radians ? 2 * Math.PI : 360;
  return {
    fn: m[2] as Fn,
    coefficient,
    constant,
    k,
    radians,
    domain: statedDomain ?? {
      lower: 0,
      upper: revolution,
      lowerInclusive: true,
      upperInclusive: false,
    },
  };
}

/** Principal value plus the second solution in one revolution. */
function solutions(fn: Fn, k: number, radians: boolean): number[] {
  if (fn === 'sin') {
    const p = radians ? Math.asin(k) : rad2deg(Math.asin(k));
    return norm([p, radians ? Math.PI - p : 180 - p], radians);
  }
  if (fn === 'cos') {
    const p = radians ? Math.acos(k) : rad2deg(Math.acos(k));
    return norm([p, radians ? 2 * Math.PI - p : 360 - p], radians);
  }
  const p = radians ? Math.atan(k) : rad2deg(Math.atan(k));
  return norm([p, p + (radians ? Math.PI : 180)], radians);
}
function norm(xs: number[], radians: boolean): number[] {
  const period = radians ? 2 * Math.PI : 360;
  const out = xs.map((x) => ((x % period) + period) % period);
  return [...new Set(out.map((x) => Math.round(x * 1e6) / 1e6))].sort(
    (a, b) => a - b,
  );
}

function solutionsInDomain(eq: TrigEq): number[] {
  const base = solutions(eq.fn, eq.k, eq.radians);
  const revolution = eq.radians ? 2 * Math.PI : 360;
  const tolerance = 1e-8;
  const inside = (value: number): boolean => {
    const above = eq.domain.lowerInclusive
      ? value >= eq.domain.lower - tolerance
      : value > eq.domain.lower + tolerance;
    const below = eq.domain.upperInclusive
      ? value <= eq.domain.upper + tolerance
      : value < eq.domain.upper - tolerance;
    return above && below;
  };
  const found: number[] = [];
  for (const value of base) {
    const first = Math.floor((eq.domain.lower - value) / revolution) - 1;
    const last = Math.ceil((eq.domain.upper - value) / revolution) + 1;
    for (let turn = first; turn <= last; turn++) {
      const candidate = value + turn * revolution;
      if (inside(candidate)) found.push(candidate);
    }
  }
  return found
    .sort((a, b) => a - b)
    .filter(
      (value, index, all) =>
        index === 0 || Math.abs(value - all[index - 1]) > tolerance,
    );
}

export const trigEquationSolver: Solver = {
  id: 'trig-equations',
  title: 'Trigonometric equations',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Solve sin, cos and tan equations, including a·f(x) + b = c.',
  placeholder: 'e.g.  sin x = 0.5',
  methods: [
    {
      id: 'unit-circle',
      name: 'Unit circle',
      blurb:
        'Find the principal value, then use symmetry to get every solution in the revolution.',
    },
  ],
  defaultMethodId: 'unit-circle',
  detect(input) {
    try {
      parse(input);
      return 0.96;
    } catch {
      return 0;
    }
  },
  solve(input): SolveResult {
    let eq: TrigEq;
    try {
      eq = parse(input);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Could not read that equation.',
      };
    }
    const { fn, coefficient, constant, k, radians, domain } = eq;

    if ((fn === 'sin' || fn === 'cos') && Math.abs(k) > 1) {
      return {
        ok: false,
        error: `${fn} x can only be between −1 and 1, so ${fn} x = ${fmt(k, 6)} has no solutions.`,
      };
    }

    const sols = solutionsInDomain(eq);
    const principalRadians =
      fn === 'sin' ? Math.asin(k) : fn === 'cos' ? Math.acos(k) : Math.atan(k);
    const principal = radians ? principalRadians : rad2deg(principalRadians);
    const unit = radians ? RAD : DEG;

    const symmetry =
      fn === 'sin'
        ? `Sine is ${k >= 0 ? 'positive in quadrants I and II' : 'negative in quadrants III and IV'}.`
        : fn === 'cos'
          ? `Cosine is ${k >= 0 ? 'positive in quadrants I and IV' : 'negative in quadrants II and III'}.`
          : `Tangent is ${k >= 0 ? 'positive in quadrants I and III' : 'negative in quadrants II and IV'} and repeats every 180°.`;
    const solutionList = sols
      .map((x) => `x = ${radians ? radLatex(x) : fmt(x, 6) + unit}`)
      .join(',\\; ');
    const domainSolutions =
      sols.length > 0
        ? sols
            .map((x) => `${radians ? radLatex(x) : fmt(x, 6) + unit}`)
            .join(', \\quad ')
        : '\\text{No solutions in this domain}';

    const steps: Step[] = [
      {
        note: 'Write down the equation.',
        latex:
          coefficient === 1 && constant === 0
            ? `\\${fn} x = ${fmt(k, 6)}`
            : `${fmt(coefficient, 6)}\\${fn}x ${constant < 0 ? '-' : '+'} ${fmt(Math.abs(constant), 6)} = ${fmt(coefficient * k + constant, 6)}`,
      },
    ];
    if (coefficient !== 1 || constant !== 0) {
      steps.push({
        note: 'Undo the outside linear operation before using the unit circle.',
        latex: `\\${fn}x = \\dfrac{${fmt(coefficient * k + constant, 6)} ${constant < 0 ? '+' : '-'} ${fmt(Math.abs(constant), 6)}}{${fmt(coefficient, 6)}} = ${fmt(k, 6)}`,
        annotation: 'algebra first',
      });
    }
    steps.push(
      {
        note: 'Take the inverse to find the principal value.',
        latex: `x = \\${fn}^{-1}(${fmt(k, 6)}) = ${radians ? radLatex(principal) : fmt(principal, 6) + unit}`,
        annotation: 'principal value',
      },
      {
        note: radians
          ? fn === 'tan'
            ? `${symmetry.replace('180°', '$\\pi$')}`
            : symmetry
          : symmetry,
        latex:
          sols.length > 0
            ? sols
                .map((x) => `x = ${radians ? radLatex(x) : fmt(x, 6) + unit}`)
                .join(', \\quad ')
            : '\\text{No solutions fall in the stated domain}',
      },
      {
        note: radians
          ? `Solutions in the stated domain $${radLatex(domain.lower)} ${domain.lowerInclusive ? '\\le' : '<'} x ${domain.upperInclusive ? '\\le' : '<'} ${radLatex(domain.upper)}$.`
          : `Solutions in the stated domain $${fmt(domain.lower, 6)}^{\\circ} ${domain.lowerInclusive ? '\\le' : '<'} x ${domain.upperInclusive ? '\\le' : '<'} ${fmt(domain.upper, 6)}^{\\circ}$.`,
        latex: domainSolutions,
        annotation: radians
          ? 'add $2\\pi n$ for the general solution'
          : 'add 360°n for the general solution',
      },
    );

    return {
      ok: true,
      solution: {
        headline: `Solve $\\${fn} x = ${fmt(k, 6)}$`,
        methodName: 'Unit circle',
        steps,
        answerLatex:
          solutionList || '\\text{No solutions in the stated domain}',
      },
    };
  },
};
