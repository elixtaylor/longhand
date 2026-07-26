import { Rational } from '../../lib/math/rational';
import { parsePoly, Poly, ParseError } from '../../lib/math/parse';
import { rl, polyLatex } from '../../lib/math/format';
import { quadraticRoots } from '../quadratics';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/** Linear and quadratic inequalities, including the sign-flip rule. */

type Rel = '<' | '>' | '<=' | '>=';

const PRETTY: Record<Rel, string> = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' };
const FLIP: Record<Rel, Rel> = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };

interface Ineq {
  lhs: Poly;
  rhs: Poly;
  rel: Rel;
}

function parse(input: string): Ineq {
  const s = input.replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/\s+/g, '');
  const m = s.match(/^(.+?)(<=|>=|<|>)(.+)$/);
  if (!m) throw new ParseError('An inequality needs <, >, ≤ or ≥ — e.g.  3x + 2 > 8');
  return { lhs: parsePoly(m[1], 'x'), rhs: parsePoly(m[3], 'x'), rel: m[2] as Rel };
}

function solveLinear(iq: Ineq): SolveResult {
  const std = iq.lhs.sub(iq.rhs); // ax + b  REL  0
  const a = std.get(1);
  const b = std.get(0);
  let rel = iq.rel;

  const steps: Step[] = [
    { note: 'Write the inequality.', latex: `${polyLatex(iq.lhs)} ${PRETTY[iq.rel]} ${polyLatex(iq.rhs)}` },
    {
      note: 'Collect every term on the left, keeping the inequality sign the same.',
      latex: `${polyLatex(std)} ${PRETTY[rel]} 0`,
    },
  ];

  if (a.isZero()) {
    const holds = evalRel(b.toNumber(), rel);
    steps.push({
      note: 'The $x$ terms cancel, so the inequality is either always true or never true.',
      latex: holds ? '\\text{True for every } x' : '\\text{No solution}',
    });
    return { ok: true, solution: { headline: 'Solve the inequality', methodName: 'Balancing', steps } };
  }

  steps.push({
    note: `Move the constant across.`,
    latex: `${termX(a)} ${PRETTY[rel]} ${rl(b.neg())}`,
  });

  const value = b.neg().div(a);
  if (a.isNeg()) {
    rel = FLIP[rel];
    steps.push({
      note: `Divide both sides by $${rl(a)}$. Dividing by a negative **reverses** the inequality sign.`,
      latex: `x ${PRETTY[rel]} \\dfrac{${rl(b.neg())}}{${rl(a)}}`,
      annotation: 'sign flipped!',
    });
  } else {
    steps.push({
      note: `Divide both sides by $${rl(a)}$.`,
      latex: `x ${PRETTY[rel]} \\dfrac{${rl(b.neg())}}{${rl(a)}}`,
    });
  }
  // The division is its own move, not a tail on the line that set it up.
  steps.push({ note: 'Work out the division.', latex: `x ${PRETTY[rel]} ${rl(value)}` });

  const answer = `x ${PRETTY[rel]} ${rl(value)}`;
  const v = value.toNumber();
  const inclusive = rel.includes('=');
  steps.push({
    note: 'On a number line this is everything ' + (rel.startsWith('<') ? 'to the left of' : 'to the right of') +
      ` $${rl(value)}$, with ${inclusive ? 'a filled circle (the value is included)' : 'an open circle (the value is not included)'}.`,
    // No latex: the line above already states the solution, and the diagram
    // is what this step adds.
    visual: {
      kind: 'number-line',
      data: {
        points: [{ x: v, filled: inclusive }],
        regions: [rel.startsWith('<') ? { from: null, to: v } : { from: v, to: null }],
      },
    },
    annotation: 'solution set',
  });

  return { ok: true, solution: { headline: 'Solve the inequality', methodName: 'Balancing', steps, answerLatex: answer } };
}

function evalRel(v: number, rel: Rel): boolean {
  return rel === '<' ? v < 0 : rel === '>' ? v > 0 : rel === '<=' ? v <= 0 : v >= 0;
}
function termX(coeff: Rational): string {
  if (coeff.eq(Rational.int(1))) return 'x';
  if (coeff.eq(Rational.int(-1))) return '-x';
  return `${rl(coeff)}x`;
}

function solveQuadratic(iq: Ineq): SolveResult {
  let std = iq.lhs.sub(iq.rhs);
  let rel = iq.rel;
  const steps: Step[] = [
    { note: 'Write the inequality.', latex: `${polyLatex(iq.lhs)} ${PRETTY[iq.rel]} ${polyLatex(iq.rhs)}` },
    { note: 'Bring everything to one side.', latex: `${polyLatex(std)} ${PRETTY[rel]} 0` },
  ];

  // Work with a positive leading coefficient so the parabola opens upwards.
  if (std.get(2).isNeg()) {
    const neg = new Map<number, Rational>();
    for (const { power, coeff } of std.terms()) neg.set(power, coeff.neg());
    std = new Poly(neg, 'x');
    rel = FLIP[rel];
    steps.push({
      note: 'Multiply through by $-1$ so the $x^2$ term is positive. This reverses the inequality.',
      latex: `${polyLatex(std)} ${PRETTY[rel]} 0`,
      annotation: 'sign flipped!',
    });
  }

  const a = std.get(2).toNumber();
  const b = std.get(1).toNumber();
  const c = std.get(0).toNumber();
  const info = quadraticRoots(a, b, c);

  if (info.nature === 'complex') {
    const alwaysPositive = rel === '>' || rel === '>=';
    steps.push({
      note: 'The discriminant is negative, so the parabola never crosses the $x$-axis — it is positive everywhere.',
      latex: `\\Delta = ${info.discriminant} < 0`,
    });
    steps.push({
      note: alwaysPositive ? 'So the inequality holds for every value of $x$.' : 'So the inequality is never satisfied.',
      latex: alwaysPositive ? '\\text{True for every } x' : '\\text{No solution}',
      annotation: 'solution set',
    });
    return { ok: true, solution: { headline: 'Solve the quadratic inequality', methodName: 'Sign diagram', steps } };
  }

  const roots = [...info.numericRoots].sort((x, y) => x - y);
  steps.push({
    note: 'Solve the matching equation to find where the parabola crosses the axis — these are the critical values.',
    latex: `${polyLatex(std)} = 0 \\;\\Rightarrow\\; ${info.answerLatex}`,
    annotation: 'critical values',
  });

  const [lo, hi] = roots.length === 2 ? roots : [roots[0], roots[0]];
  const below = rel === '<' || rel === '<=';
  const inclusive = rel.includes('=');
  const lb = fmtRoot(lo);
  const hb = fmtRoot(hi);

  steps.push({
    note: 'The parabola opens upwards, so it is **below** the axis between the roots and **above** it outside them.',
    latex: `\\text{negative for } ${lb} < x < ${hb}, \\quad \\text{positive outside}`,
  });

  let answer: string;
  if (roots.length === 1 || lo === hi) {
    // Repeated root: the parabola only touches the axis.
    answer = below
      ? inclusive
        ? `x = ${lb}`
        : '\\text{No solution}'
      : inclusive
        ? '\\text{True for every } x'
        : `x \\ne ${lb}`;
  } else if (below) {
    answer = inclusive ? `${lb} \\le x \\le ${hb}` : `${lb} < x < ${hb}`;
  } else {
    answer = inclusive ? `x \\le ${lb} \\;\\text{or}\\; x \\ge ${hb}` : `x < ${lb} \\;\\text{or}\\; x > ${hb}`;
  }

  steps.push({
    note: below
      ? 'We want where it is negative, so take the interval between the roots.'
      : 'We want where it is positive, so take the two outer intervals.',
    latex: answer,
    visual:
      roots.length === 2 && lo !== hi
        ? {
            kind: 'number-line',
            data: {
              points: [
                { x: lo, filled: inclusive },
                { x: hi, filled: inclusive },
              ],
              regions: below
                ? [{ from: lo, to: hi }]
                : [
                    { from: null, to: lo },
                    { from: hi, to: null },
                  ],
            },
          }
        : undefined,
    annotation: 'solution set',
  });

  return {
    ok: true,
    solution: { headline: 'Solve the quadratic inequality', methodName: 'Sign diagram', steps, answerLatex: answer },
  };
}

function fmtRoot(x: number): string {
  const r = Math.round(x * 1e6) / 1e6;
  return Number.isInteger(r) ? String(r) : String(r);
}

export const inequalitySolver: Solver = {
  id: 'inequalities',
  title: 'Inequalities',
  subjects: ['Methods', 'General'],
  blurb: 'Solve linear and quadratic inequalities, including the sign-flip rule.',
  placeholder: 'e.g.  3x + 2 > 8   or   x^2 - 5x + 6 < 0',
  methods: [
    { id: 'auto', name: 'What it needs', blurb: 'Balances a linear inequality, or uses a sign diagram for a quadratic.' },
  ],
  defaultMethodId: 'auto',
  detect(input) {
    if (!/[<>]|≤|≥/.test(input)) return 0;
    // Interval notation and vector/matrix brackets also contain < >.
    if (/[[\]]/.test(input)) return 0;
    try {
      const iq = parse(input);
      return iq.lhs.degree() <= 2 && iq.rhs.degree() <= 2 ? 0.95 : 0;
    } catch {
      return 0;
    }
  },
  solve(input): SolveResult {
    let iq: Ineq;
    try {
      iq = parse(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that inequality.' };
    }
    const std = iq.lhs.sub(iq.rhs);
    if (std.degree() > 2) {
      return { ok: false, error: 'This topic handles linear and quadratic inequalities (up to x²).' };
    }
    return std.get(2).isZero() ? solveLinear(iq) : solveQuadratic(iq);
  },
};
