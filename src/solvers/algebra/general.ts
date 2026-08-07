import {
  evaluateExpr,
  hasVariable,
  parseExpr,
  simplify,
  toLatex,
  type Expr,
} from '../../lib/math/expr';
import { fmt } from '../../lib/math/num';
import type { Solver, SolveResult, Step } from '../../lib/engine/types';

/**
 * A deliberately low-priority safety net for equations that do not belong to
 * one of the named SACE topics. It handles one-variable numerical equations
 * involving the full expression grammar: trig, inverse trig, logs, roots,
 * exponentials, absolute values and nested combinations.
 */

function clean(input: string): string {
  return input
    .replace(/\b(?:solve|find|the|equation|roots?|zeros?|where)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitEquation(input: string): [string, string] | null {
  const cleaned = clean(input);
  const parts = cleaned.split('=');
  if (parts.length !== 2 || parts.some((part) => part.trim() === ''))
    return null;
  return [parts[0].trim(), parts[1].trim()];
}

function difference(a: Expr, b: Expr): Expr {
  return { t: 'sub', a, b };
}

function onlyX(e: Expr): boolean {
  switch (e.t) {
    case 'num':
      return true;
    case 'var':
      return e.name === 'x' || e.name === 'e' || e.name === 'π';
    case 'neg':
    case 'fn':
      return onlyX(e.a);
    default:
      return onlyX(e.a) && onlyX(e.b);
  }
}

function value(f: Expr, x: number): number {
  return evaluateExpr(f, { x });
}

function addRoot(found: number[], candidate: number): void {
  if (!Number.isFinite(candidate)) return;
  if (found.every((root) => Math.abs(root - candidate) > 1e-5))
    found.push(candidate);
}

interface BisectionTrace {
  left: number;
  right: number;
  rows: { left: number; right: number; middle: number; value: number }[];
  root: number;
}

interface NumericalRoots {
  roots: number[];
  traces: BisectionTrace[];
}

function refineMinimum(f: Expr, left: number, right: number): number | null {
  // Golden-section search catches repeated roots, which never change sign.
  let a = left;
  let b = right;
  const phi = (1 + Math.sqrt(5)) / 2;
  let c = b - (b - a) / phi;
  let d = a + (b - a) / phi;
  const absValue = (x: number) => {
    const y = value(f, x);
    return Number.isFinite(y) ? Math.abs(y) : Number.POSITIVE_INFINITY;
  };
  for (let i = 0; i < 45; i++) {
    if (absValue(c) < absValue(d)) {
      b = d;
    } else {
      a = c;
    }
    c = b - (b - a) / phi;
    d = a + (b - a) / phi;
  }
  const x = (a + b) / 2;
  return absValue(x) < 1e-7 ? x : null;
}

/** Refine one sign-changing bracket while retaining a short working trace. */
function bisectRoot(
  f: Expr,
  initialLeft: number,
  initialRight: number,
): BisectionTrace {
  let left = initialLeft;
  let right = initialRight;
  let leftValue = value(f, left);
  const rows: BisectionTrace['rows'] = [];
  for (let i = 0; i < 70; i++) {
    const middle = (left + right) / 2;
    const middleValue = value(f, middle);
    rows.push({ left, right, middle, value: middleValue });
    if (!Number.isFinite(middleValue)) break;
    if (Math.abs(middleValue) < 1e-12) {
      left = middle;
      right = middle;
      break;
    }
    if (leftValue * middleValue <= 0) right = middle;
    else {
      left = middle;
      leftValue = middleValue;
    }
  }
  return {
    left: initialLeft,
    right: initialRight,
    rows,
    root: (left + right) / 2,
  };
}

/** Find sign changes and repeated roots, avoiding poles and undefined values. */
function numericalRoots(f: Expr): NumericalRoots {
  const roots: number[] = [];
  const traces: BisectionTrace[] = [];
  const min = -1000;
  const max = 1000;
  const step = 0.5;
  let previousX = min;
  let previous = value(f, previousX);
  for (let x = min + step; x <= max; x += step) {
    const current = value(f, x);
    if (Number.isFinite(previous) && Math.abs(previous) < 1e-8)
      addRoot(roots, previousX);
    if (
      Number.isFinite(previous) &&
      Number.isFinite(current) &&
      Math.abs(previous) < 1e6 &&
      Math.abs(current) < 1e6 &&
      x < max - step
    ) {
      const next = value(f, x + step);
      if (
        Number.isFinite(next) &&
        Math.abs(current) <= Math.abs(previous) &&
        Math.abs(current) <= Math.abs(next)
      ) {
        const repeated = refineMinimum(f, x - step, x + step);
        if (repeated !== null) addRoot(roots, repeated);
      }
    }
    if (
      Number.isFinite(previous) &&
      Number.isFinite(current) &&
      Math.abs(previous) < 1e6 &&
      Math.abs(current) < 1e6 &&
      previous * current < 0
    ) {
      const trace = bisectRoot(f, previousX, x);
      addRoot(roots, trace.root);
      traces.push(trace);
    }
    previousX = x;
    previous = current;
  }
  if (Number.isFinite(previous) && Math.abs(previous) < 1e-8)
    addRoot(roots, max);
  return { roots: roots.sort((a, b) => a - b), traces };
}

function solveEquation(leftText: string, rightText: string): SolveResult {
  let left: Expr;
  let right: Expr;
  try {
    left = parseExpr(leftText);
    right = parseExpr(rightText);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Could not read that equation.',
    };
  }
  if (!onlyX(left) || !onlyX(right))
    return {
      ok: false,
      error: 'The numerical fallback currently solves one variable, x.',
    };
  const f = simplify(difference(left, right));
  if (!hasVariable(f)) {
    const leftValue = evaluateExpr(left);
    const rightValue = evaluateExpr(right);
    const residual = leftValue - rightValue;
    const trueStatement =
      Number.isFinite(residual) && Math.abs(residual) < 1e-10;
    const leftLatex = toLatex(left);
    const rightLatex = toLatex(right);
    return {
      ok: true,
      solution: {
        headline: `${leftLatex} = ${rightLatex}`,
        methodName: 'Numerical equation solver',
        steps: [
          {
            note: 'Evaluate the left-hand side and right-hand side separately.',
            latex: `${leftLatex} = ${fmt(leftValue, 8)} \\quad\\text{and}\\quad ${rightLatex} = ${fmt(rightValue, 8)}`,
          },
          {
            note: trueStatement
              ? 'Both sides have the same value, so the equation is true.'
              : 'The two sides have different values, so the equation is false.',
            latex: trueStatement
              ? `${leftLatex} = ${rightLatex}`
              : `${fmt(leftValue, 8)} \\ne ${fmt(rightValue, 8)}`,
          },
        ],
        answerLatex: trueStatement
          ? `${leftLatex} = ${rightLatex}`
          : '\\text{false}',
      },
    };
  }

  const numerical = numericalRoots(f);
  const roots = numerical.roots;
  const steps: Step[] = [
    {
      note: 'Move everything to one side so the equation is f(x) = 0.',
      latex: `${toLatex(f)} = 0`,
    },
    {
      note: 'Search the real domain, bracket each sign change, and halve the interval repeatedly.',
      latex: numerical.traces.length
        ? `f(${fmt(numerical.traces[0].left, 6)}) = ${fmt(value(f, numerical.traces[0].left), 6)}, \\quad f(${fmt(numerical.traces[0].right, 6)}) = ${fmt(value(f, numerical.traces[0].right), 6)}`
        : 'No sign-changing bracket was found.',
    },
  ];
  numerical.traces.forEach((trace, rootIndex) => {
    const shown = trace.rows.slice(0, 6);
    shown.forEach((row, iteration) => {
      steps.push({
        note: `Halve the interval for root ${rootIndex + 1}.`,
        latex: `m_${iteration + 1} = \\dfrac{${fmt(row.left, 6)} + ${fmt(row.right, 6)}}{2} = ${fmt(row.middle, 6)}, \\quad f(m_${iteration + 1}) = ${fmt(row.value, 6)}`,
      });
    });
    if (trace.rows.length > shown.length) {
      steps.push({
        note: 'Continue the same interval-halving process until the residual is within the displayed precision.',
        latex: `x \\approx ${fmt(trace.root, 8)}`,
      });
    }
  });
  if (roots.length === 0) {
    steps.push({
      note: 'No real root was located in the searched domain −1000 ≤ x ≤ 1000. This search cannot prove that no root exists elsewhere.',
      latex: '\\text{no real solutions}',
    });
    return {
      ok: true,
      solution: {
        headline: `Solve ${toLatex(left)} = ${toLatex(right)}`,
        methodName: 'Numerical equation solver',
        steps,
        answerLatex: '\\text{no root found in search domain}',
      },
    };
  }
  steps.push({
    note: 'The real solutions are:',
    latex: roots.map((root) => `x \\approx ${fmt(root, 8)}`).join(', \\quad '),
    annotation: 'numerical answer',
  });
  return {
    ok: true,
    solution: {
      headline: `Solve ${toLatex(left)} = ${toLatex(right)}`,
      methodName: 'Numerical equation solver',
      steps,
      answerLatex: roots
        .map((root) => `x \\approx ${fmt(root, 8)}`)
        .join(', \\quad '),
    },
  };
}

export const generalSolver: Solver = {
  id: 'general-equation',
  title: 'General equations',
  subjects: ['General', 'Methods', 'Specialist'],
  blurb:
    'A numerical fallback for advanced one-variable equations and expressions.',
  placeholder: 'e.g.  sin(x) = x/2   or   sqrt(x + 1) = 3',
  methods: [
    {
      id: 'numerical',
      name: 'Numerical solution',
      blurb: 'Rearrange to f(x) = 0, then locate and refine real roots.',
    },
  ],
  defaultMethodId: 'numerical',
  detect(input) {
    const equation = splitEquation(input);
    if (equation) {
      try {
        const left = parseExpr(equation[0]);
        const right = parseExpr(equation[1]);
        if (!onlyX(left) || !onlyX(right)) return 0;
        return 0.34;
      } catch {
        return 0;
      }
    }
    if (/[=]/.test(input)) return 0;
    if (/rationalise|rationalize|simplify/i.test(input)) return 0;
    if (/sqrt\s*\([^)]*\).*sqrt\s*\(/i.test(input)) return 0;
    try {
      const expression = parseExpr(clean(input));
      if (!onlyX(expression)) return 0;
      return 0.31;
    } catch {
      return 0;
    }
  },
  solve(input): SolveResult {
    const equation = splitEquation(input);
    if (equation) return solveEquation(equation[0], equation[1]);
    try {
      const expression = parseExpr(clean(input));
      if (!onlyX(expression) || hasVariable(expression))
        return {
          ok: false,
          error: 'Enter an equation with =, or give a numerical expression.',
        };
      const result = evaluateExpr(expression);
      if (!Number.isFinite(result))
        return {
          ok: false,
          error: 'That expression is not defined over the real numbers.',
        };
      return {
        ok: true,
        solution: {
          headline: `Evaluate ${toLatex(expression)}`,
          methodName: 'Numerical evaluation',
          steps: [
            {
              note: 'Evaluate the expression.',
              latex: `${toLatex(expression)} = ${fmt(result, 10)}`,
            },
          ],
          answerLatex: fmt(result, 10),
        },
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Could not read that expression.',
      };
    }
  },
};
