import { Rational } from '../../lib/math/rational';
import { parseEquation, Poly, ParseError } from '../../lib/math/parse';
import { rl, polyLatex, connectTerm } from '../../lib/math/format';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/** Build a display polynomial  a·x + b. */
function linearPoly(a: Rational, b: Rational): Poly {
  const m = new Map<number, Rational>();
  m.set(1, a);
  m.set(0, b);
  return new Poly(m, 'x');
}

interface Linear {
  a: Rational; // coeff of x on the left
  b: Rational; // constant on the left
  c: Rational; // coeff of x on the right
  d: Rational; // constant on the right
}

function parseLinear(input: string): Linear {
  const eq = parseEquation(input, 'x');
  if (eq.lhs.degree() > 1 || eq.rhs.degree() > 1) {
    throw new ParseError('That has an x² term — try the "Quadratic equations" topic.');
  }
  if (input.indexOf('=') === -1) {
    throw new ParseError('A linear equation needs an "=" sign, e.g. 3x + 4 = 10.');
  }
  return {
    a: eq.lhs.get(1),
    b: eq.lhs.get(0),
    c: eq.rhs.get(1),
    d: eq.rhs.get(0),
  };
}

/** Solve exactly; returns the value of x, or a special outcome. */
function solveValue(lin: Linear): { kind: 'unique'; x: Rational } | { kind: 'none' | 'infinite' } {
  const A = lin.a.sub(lin.c);
  const D = lin.d.sub(lin.b);
  if (A.isZero()) return D.isZero() ? { kind: 'infinite' } : { kind: 'none' };
  return { kind: 'unique', x: D.div(A) };
}

function headline(lin: Linear): string {
  return `Solve $${polyLatex(linearPoly(lin.a, lin.b))} = ${polyLatex(linearPoly(lin.c, lin.d))}$`;
}

/* -------------------------------------------------------------- balance method */
function solveByBalance(lin: Linear): SolveResult {
  const outcome = solveValue(lin);
  const steps: Step[] = [
    {
      note: 'Write out the equation.',
      latex: `${polyLatex(linearPoly(lin.a, lin.b))} = ${polyLatex(linearPoly(lin.c, lin.d))}`,
    },
  ];

  if (outcome.kind !== 'unique') return terminal(lin, 'Balance method', steps, outcome.kind);

  const A = lin.a.sub(lin.c);
  let leftConst = lin.b;
  let rightConst = lin.d;

  // Balancing is taught as two lines per move: write the same operation on
  // both sides, *then* tidy up. Showing only the tidied line hides the very
  // thing the method is about, so each move gets both.
  const undo = (r: Rational) => (r.isNeg() ? `+ ${rl(r.abs())}` : `- ${rl(r)}`);

  // Gather the x-terms on the left.
  if (!lin.c.isZero()) {
    steps.push({
      note: `Take $${termX(lin.c)}$ off both sides, so the $x$-terms end up together.`,
      latex: `${polyLatex(linearPoly(lin.a, lin.b))} ${undo(lin.c)}x = ${polyLatex(linearPoly(lin.c, lin.d))} ${undo(lin.c)}x`,
      annotation: 'same to both sides',
    });
    steps.push({
      note: `On the left $${termX(lin.a)} ${undo(lin.c)}x = ${termX(A)}$; on the right the $x$-terms cancel.`,
      latex: `${polyLatex(linearPoly(A, leftConst))} = ${rl(rightConst)}`,
    });
  }
  // Move the constant to the right.
  if (!leftConst.isZero()) {
    const moved = leftConst;
    const before = rightConst;
    rightConst = rightConst.sub(leftConst);
    steps.push({
      note: `${moved.isNeg() ? 'Add' : 'Subtract'} $${rl(moved.abs())}$ ${moved.isNeg() ? 'to' : 'from'} both sides to leave the $x$-term on its own.`,
      latex: `${termX(A)}${connectTerm(moved, 0, 'x')} ${undo(moved)} = ${rl(before)} ${undo(moved)}`,
      annotation: 'same to both sides',
    });
    steps.push({
      note: `The constants on the left cancel, and the right is $${rl(before)} ${undo(moved)} = ${rl(rightConst)}$.`,
      latex: `${termX(A)} = ${rl(rightConst)}`,
    });
    leftConst = Rational.int(0);
  }
  // Divide through by the coefficient.
  if (!A.eq(Rational.int(1))) {
    steps.push({
      note: `$x$ is multiplied by $${rl(A)}$, so divide both sides by $${rl(A)}$ to undo it.`,
      latex: `\\dfrac{${termX(A)}}{${rl(A)}} = \\dfrac{${rl(rightConst)}}{${rl(A)}}`,
      annotation: 'same to both sides',
    });
    steps.push({
      note: 'The left-hand side cancels down to $x$.',
      latex: `x = \\dfrac{${rl(rightConst)}}{${rl(A)}}`,
    });
    steps.push({ note: 'Work out the division.', latex: `x = ${rl(outcome.x)}`, annotation: 'solved' });
  } else {
    // The last line already reads x = …; repeating it would be padding.
    steps[steps.length - 1].annotation = 'solved';
  }

  return {
    ok: true,
    solution: { headline: headline(lin), methodName: 'Balance method', steps, answerLatex: `x = ${rl(outcome.x)}` },
  };
}

/* --------------------------------------------------------- backtracking method */
function solveByBacktracking(lin: Linear): SolveResult {
  const outcome = solveValue(lin);
  const steps: Step[] = [
    {
      note: 'Write out the equation.',
      latex: `${polyLatex(linearPoly(lin.a, lin.b))} = ${polyLatex(linearPoly(lin.c, lin.d))}`,
    },
  ];
  if (outcome.kind !== 'unique') return terminal(lin, 'Backtracking', steps, outcome.kind);

  const A = lin.a.sub(lin.c);
  const B = lin.b;
  const D = lin.d;

  if (!lin.c.isZero()) {
    steps.push({
      note: `First gather the $x$-terms: subtract $${termX(lin.c)}$ from both sides.`,
      latex: `${polyLatex(linearPoly(A, B))} = ${rl(D)}`,
    });
  }
  const build = B.isZero()
    ? `x \\;\\xrightarrow{\\times ${rl(A)}}\\; ${rl(A)}x = ${rl(D)}`
    : `x \\;\\xrightarrow{\\times ${rl(A)}}\\; ${termX(A)} \\;\\xrightarrow{+\\,${rl(B)}}\\; ${termX(A)} + ${rl(B)} = ${rl(D)}`;
  steps.push({
    note: 'Trace how $x$ is built up into the equation.',
    latex: build,
    annotation: 'forwards',
  });

  const afterMinus = D.sub(B);
  const reverse = B.isZero()
    ? `${rl(D)} \\;\\xrightarrow{\\div ${rl(A)}}\\; x`
    : `${rl(D)} \\;\\xrightarrow{-\\,${rl(B)}}\\; ${rl(afterMinus)} \\;\\xrightarrow{\\div ${rl(A)}}\\; x`;
  steps.push({
    note: 'Undo each step in reverse to get $x$.',
    latex: reverse,
    annotation: 'backwards',
  });
  steps.push({ note: 'Simplify.', latex: `x = ${rl(outcome.x)}`, annotation: 'solved' });

  return {
    ok: true,
    solution: { headline: headline(lin), methodName: 'Backtracking', steps, answerLatex: `x = ${rl(outcome.x)}` },
  };
}

/** "3x", "x", "-x" for a rational coefficient. */
function termX(coeff: Rational): string {
  if (coeff.eq(Rational.int(1))) return 'x';
  if (coeff.eq(Rational.int(-1))) return '-x';
  return `${rl(coeff)}x`;
}

function terminal(lin: Linear, methodName: string, steps: Step[], kind: 'none' | 'infinite'): SolveResult {
  steps.push({
    note:
      kind === 'none'
        ? 'The $x$-terms cancel but the constants don’t match, so there is no solution.'
        : 'Both sides are identical, so every value of $x$ works — infinitely many solutions.',
    latex: kind === 'none' ? '\\text{No solution}' : '\\text{Infinitely many solutions}',
  });
  return { ok: true, solution: { headline: headline(lin), methodName, steps } };
}

export const linearSolver: Solver = {
  id: 'linear',
  title: 'Linear equations',
  subjects: ['General', 'Methods'],
  blurb: 'Solve for x in a straight-line equation.',
  placeholder: 'e.g.  3x + 4 = 2x - 5',
  methods: [
    { id: 'balance', name: 'Balancing', blurb: 'Do the same to both sides until x is on its own. The standard method.' },
    { id: 'backtracking', name: 'Backtracking', blurb: 'Trace how x is built up, then undo each operation in reverse.' },
  ],
  defaultMethodId: 'balance',
  detect(input) {
    if (!input.includes('=')) return 0;
    if (/[;\n]/.test(input)) return 0; // two equations → simultaneous
    if (/\^\s*[2-9]|²|³/.test(input)) return 0; // higher powers → not linear
    if (/[yY]/.test(input)) return 0; // two unknowns → simultaneous
    if (!/[a-zA-Z]/.test(input)) return 0;
    try {
      const lin = parseLinear(input);
      return lin.a.isZero() && lin.c.isZero() ? 0 : 0.8;
    } catch {
      return 0;
    }
  },
  solve(input, methodId): SolveResult {
    let lin: Linear;
    try {
      lin = parseLinear(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that equation.' };
    }
    if (lin.a.isZero() && lin.c.isZero()) {
      return { ok: false, error: 'There is no x to solve for.' };
    }
    return methodId === 'backtracking' ? solveByBacktracking(lin) : solveByBalance(lin);
  },
};
