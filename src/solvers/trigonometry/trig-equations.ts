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
        return numerator === 1 ? '\\pi' : `${numerator}\\pi`;
      if (numerator === 1) return `\\dfrac{\\pi}{${denominator}}`;
      return `\\dfrac{${numerator}\\pi}{${denominator}}`;
    }
  }
  return `${fmt(value, 6)}${RAD}`;
}

function parse(input: string): TrigEq {
  const radians = /\b(?:rad|radian|radians)\b|π|\bpi\b/i.test(input);
  const s = input
    .replace(/\b(?:rad|radian|radians|deg|degree|degrees)\b/gi, '')
    .replace(/°/g, '')
    .replace(/\s+/g, '')
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
  return {
    fn: m[2] as Fn,
    coefficient,
    constant,
    k: (rhs - constant) / coefficient,
    radians,
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
    const { fn, coefficient, constant, k, radians } = eq;

    if ((fn === 'sin' || fn === 'cos') && Math.abs(k) > 1) {
      return {
        ok: false,
        error: `${fn} x can only be between −1 and 1, so ${fn} x = ${fmt(k)} has no solutions.`,
      };
    }

    const sols = solutions(fn, k, radians);
    const principalRadians =
      fn === 'sin' ? Math.asin(k) : fn === 'cos' ? Math.acos(k) : Math.atan(k);
    const principal = radians ? principalRadians : rad2deg(principalRadians);
    const unit = radians ? RAD : DEG;

    const symmetry =
      fn === 'sin'
        ? 'Sine is positive in the first and second quadrants, so the second solution is $180^{\\circ} - x$.'
        : fn === 'cos'
          ? 'Cosine repeats symmetrically about the horizontal axis, so the second solution is $360^{\\circ} - x$.'
          : 'Tangent repeats every $180^{\\circ}$, so add $180^{\\circ}$ for the next solution.';

    const steps: Step[] = [
      {
        note: 'Write down the equation.',
        latex:
          coefficient === 1 && constant === 0
            ? `\\${fn} x = ${fmt(k)}`
            : `${fmt(coefficient)}\\${fn}x ${constant < 0 ? '-' : '+'} ${fmt(Math.abs(constant))} = ${fmt(coefficient * k + constant)}`,
      },
    ];
    if (coefficient !== 1 || constant !== 0) {
      steps.push({
        note: 'Undo the outside linear operation before using the unit circle.',
        latex: `\\${fn}x = \\dfrac{${fmt(coefficient * k + constant)} ${constant < 0 ? '+' : '-'} ${fmt(Math.abs(constant))}}{${fmt(coefficient)}} = ${fmt(k)}`,
        annotation: 'algebra first',
      });
    }
    steps.push(
      {
        note: 'Take the inverse to find the principal value.',
        latex: `x = \\${fn}^{-1}(${fmt(k)}) = ${radians ? radLatex(principal) : fmt(principal) + unit}`,
        annotation: 'principal value',
      },
      {
        note: radians
          ? fn === 'sin'
            ? 'Sine is positive in the first and second quadrants, so the second solution is $\\pi - x$.'
            : fn === 'cos'
              ? 'Cosine is symmetric about the horizontal axis, so the second solution is $2\\pi - x$.'
              : 'Tangent repeats every $\\pi$, so add $\\pi$ for the next solution.'
          : symmetry,
        latex: sols
          .map((x) => `x = ${radians ? radLatex(x) : fmt(x) + unit}`)
          .join(', \\quad '),
      },
      {
        note: radians
          ? 'Solutions over one full revolution $0 \\le x < 2\\pi$.'
          : 'Solutions over one full revolution $0^{\\circ} \\le x < 360^{\\circ}$.',
        latex: sols
          .map((x) => `${radians ? radLatex(x) : fmt(x) + unit}`)
          .join(', \\quad '),
        annotation: radians
          ? 'add $2\\pi n$ for the general solution'
          : 'add 360°n for the general solution',
      },
    );

    return {
      ok: true,
      solution: {
        headline: `Solve $\\${fn} x = ${fmt(k)}$`,
        methodName: 'Unit circle',
        steps,
        answerLatex: sols
          .map((x) => `x = ${radians ? radLatex(x) : fmt(x) + unit}`)
          .join(',\\; '),
      },
    };
  },
};
