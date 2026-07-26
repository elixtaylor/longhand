import { fmt, deg2rad, rad2deg } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/** Solve sin/cos/tan x = k over one revolution, in degrees or radians. */
type Fn = 'sin' | 'cos' | 'tan';

interface TrigEq {
  fn: Fn;
  k: number;
  radians: boolean;
}

const DEG = '^{\\circ}';

function parse(input: string): TrigEq {
  const s = input.replace(/\s+/g, '').toLowerCase();
  const m = s.match(/^(sin|cos|tan)\(?x\)?=(-?\d*\.?\d+)$/);
  if (!m) {
    throw new Error('Write it like  sin x = 0.5  (sin, cos or tan).');
  }
  return {
    fn: m[1] as Fn,
    k: Number(m[2]),
    radians: /rad|\bπ\b|pi/i.test(input),
  };
}

/** Principal value plus the second solution in one revolution. */
function solutions(fn: Fn, k: number): number[] {
  if (fn === 'sin') {
    const p = rad2deg(Math.asin(k));
    return norm([p, 180 - p]);
  }
  if (fn === 'cos') {
    const p = rad2deg(Math.acos(k));
    return norm([p, 360 - p]);
  }
  const p = rad2deg(Math.atan(k));
  return norm([p, p + 180]);
}
function norm(xs: number[]): number[] {
  const out = xs.map((x) => ((x % 360) + 360) % 360);
  return [...new Set(out.map((x) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b);
}

export const trigEquationSolver: Solver = {
  id: 'trig-equations',
  title: 'Trigonometric equations',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Solve sin x = k, cos x = k or tan x = k.',
  placeholder: 'e.g.  sin x = 0.5',
  methods: [
    { id: 'unit-circle', name: 'Unit circle', blurb: 'Find the principal value, then use symmetry to get every solution in the revolution.' },
  ],
  defaultMethodId: 'unit-circle',
  detect(input) {
    return /^\s*(sin|cos|tan)\s*\(?\s*x\s*\)?\s*=\s*-?\d*\.?\d+\s*$/i.test(input) ? 0.96 : 0;
  },
  solve(input): SolveResult {
    let eq: TrigEq;
    try {
      eq = parse(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that equation.' };
    }
    const { fn, k, radians } = eq;

    if ((fn === 'sin' || fn === 'cos') && Math.abs(k) > 1) {
      return {
        ok: false,
        error: `${fn} x can only be between −1 and 1, so ${fn} x = ${fmt(k)} has no solutions.`,
      };
    }

    const sols = solutions(fn, k);
    const principal = rad2deg(
      fn === 'sin' ? Math.asin(k) : fn === 'cos' ? Math.acos(k) : Math.atan(k),
    );

    const symmetry =
      fn === 'sin'
        ? 'Sine is positive in the first and second quadrants, so the second solution is $180^{\\circ} - x$.'
        : fn === 'cos'
          ? 'Cosine repeats symmetrically about the horizontal axis, so the second solution is $360^{\\circ} - x$.'
          : 'Tangent repeats every $180^{\\circ}$, so add $180^{\\circ}$ for the next solution.';

    const steps: Step[] = [
      { note: 'Write down the equation.', latex: `\\${fn} x = ${fmt(k)}` },
      {
        note: 'Take the inverse to find the principal value.',
        latex: `x = \\${fn}^{-1}(${fmt(k)}) = ${fmt(principal)}${DEG}`,
        annotation: 'principal value',
      },
      { note: symmetry, latex: sols.map((x) => `x = ${fmt(x)}${DEG}`).join(', \\quad ') },
      {
        note: 'Solutions over one full revolution $0^{\\circ} \\le x < 360^{\\circ}$.',
        latex: sols.map((x) => `${fmt(x)}${DEG}`).join(', \\quad '),
        annotation: `add 360°n for the general solution`,
      },
    ];

    if (radians) {
      steps.push({
        note: 'In radians (multiply by $\\pi/180$):',
        latex: sols.map((x) => `${fmt(deg2rad(x), 4)}`).join(', \\quad '),
      });
    }

    return {
      ok: true,
      solution: {
        headline: `Solve $\\${fn} x = ${fmt(k)}$`,
        methodName: 'Unit circle',
        steps,
        answerLatex: sols.map((x) => `x = ${fmt(x)}${DEG}`).join(',\\; '),
      },
    };
  },
};
