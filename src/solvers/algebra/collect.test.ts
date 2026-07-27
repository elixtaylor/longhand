import { describe, it, expect } from 'vitest';
import { collectSolver } from './collect';
import { interpret } from '../../lib/engine/run';
import { parseExpr, evaluateExpr } from '../../lib/math/expr';

/**
 * Term collecting: brackets, products of factors, and fractions with x
 * underneath, on either or both sides. Every answer here is checked by
 * substituting back into the ORIGINAL (unexpanded) equation — a test that
 * only pins today's output would have passed throughout the period when
 * every one of these was simply unrecognised.
 */

function solve(input: string) {
  const r = collectSolver.solve(input, collectSolver.defaultMethodId);
  if (!r.ok) throw new Error(`refused: ${r.error}`);
  return r.solution;
}

function answers(latex: string | undefined): number[] {
  const out: number[] = [];
  const pm = /\\dfrac\{(-?\d+)\s*\\pm\s*\\sqrt\{(\d+)\}\}\{(-?\d+)\}/.exec(latex ?? '');
  if (pm) {
    const [n, m, d] = [Number(pm[1]), Number(pm[2]), Number(pm[3])];
    return [(n + Math.sqrt(m)) / d, (n - Math.sqrt(m)) / d];
  }
  for (const m of (latex ?? '').matchAll(/x\s*=\s*\\frac\{(-?\d+)\}\{(-?\d+)\}/g)) out.push(Number(m[1]) / Number(m[2]));
  if (out.length === 0) for (const m of (latex ?? '').matchAll(/x\s*=\s*(-?\d*\.?\d+)/g)) out.push(Number(m[1]));
  return out;
}

function satisfies(equation: string, x: number): boolean {
  const [lhs, rhs] = equation.split('=');
  const a = evaluateExpr(parseExpr(lhs), { x });
  const b = evaluateExpr(parseExpr(rhs), { x });
  return Math.abs(a - b) < 1e-4 * Math.max(1, Math.abs(a), Math.abs(b));
}

describe('term collecting', () => {
  const linear = [
    '2(x+3) = 3(x-1)',
    '3(2x - 1) - (x + 4) = 2(x + 3)',
    '4(x-2) = 2(x+3) - 5',
    '(x+1)/2 + (x-1)/3 = 4',
    '2x/3 - x/4 = 5',
    '(x+1)/(x-1) = 2',
    '3/(x+1) = 2/(x-1)',
  ];

  it.each(linear)('%s — the answer satisfies the equation', (equation) => {
    const found = answers(solve(equation).answerLatex);
    expect(found.length).toBeGreaterThan(0);
    for (const x of found) expect(satisfies(equation, x)).toBe(true);
  });

  it.each([
    ['2(x+3) = 3(x-1)', 9],
    ['3(2x - 1) - (x + 4) = 2(x + 3)', 13 / 3],
    ['4(x-2) = 2(x+3) - 5', 4.5],
    ['(x+1)/2 + (x-1)/3 = 4', 4.6],
    ['2x/3 - x/4 = 5', 12],
    ['(x+1)/(x-1) = 2', 3],
    ['3/(x+1) = 2/(x-1)', 5],
  ])('%s gives x = %d', (equation, expected) => {
    expect(answers(solve(equation).answerLatex)[0]).toBeCloseTo(expected as number, 6);
  });

  it('expands products of factors into a quadratic and solves it', () => {
    const cases = ['x(x+2) = x + 6', '(x+1)(x-1) = x + 3', 'x + 1/x = 3'];
    for (const equation of cases) {
      const found = answers(solve(equation).answerLatex);
      expect(found.length).toBe(2);
      for (const x of found) expect(satisfies(equation, x)).toBe(true);
    }
  });

  it('peels a rational root off a cubic produced by expansion', () => {
    const found = answers(solve('(x-1)(x-2)(x-3) = 0').answerLatex);
    expect(found.sort((a, b) => a - b)).toEqual([1, 2, 3]);

    const found2 = answers(solve('(2x-1)(x+1) = x^2 + 5').answerLatex);
    expect(found2.sort((a, b) => a - b)).toEqual([-3, 2]);
  });

  it('recognises an identity produced only after expanding', () => {
    const r = solve('5(x + 2) = 5x + 10');
    expect(r.answerLatex).toBeUndefined();
    expect(r.steps[r.steps.length - 1]?.latex).toBe('\\text{Infinitely many solutions}');
  });

  it('recognises a contradiction produced only after expanding', () => {
    const r = solve('2(x+3) = 2x + 5');
    expect(r.answerLatex).toBeUndefined();
    expect(r.steps[r.steps.length - 1]?.latex).toBe('\\text{No solution}');
  });

  it('rejects a root that would zero a denominator in the original equation', () => {
    // x/(x-2) = 2/(x-2) cross-multiplies to x = 2, which is exactly the value
    // the denominator forbids — so the "solution" the algebra finds is the
    // one value that was never valid to begin with.
    const r = solve('x/(x-2) = 2/(x-2)');
    expect(r.answerLatex).toBeUndefined();
    expect(r.steps.some((s) => s.annotation === 'extraneous')).toBe(true);
  });

  it('refuses a degree ≥ 3 result with no rational root, rather than guessing', () => {
    // x(x-1)(x-2) = 5  expands to  x^3 - 3x^2 + 2x - 5 = 0, which has no
    // rational root at all (checked against every p/q the theorem allows) —
    // the honest answer is refusal, not a numeric guess dressed as exact.
    const r = collectSolver.solve('x(x-1)(x-2) = 5', collectSolver.defaultMethodId);
    expect(r.ok).toBe(false);
  });

  it('leaves questions with a topic of their own alone', () => {
    const kept: [string, string][] = [
      ['3x + 5 = x + 11', 'linear'],
      ['x^2 - 5x + 6 = 0', 'quadratics'],
      ['ln x = 5', 'logarithms'],
    ];
    for (const [input, id] of kept) {
      expect(interpret(input).detection?.solver.id).toBe(id);
    }
  });

  it('picks up equations nothing else recognises', () => {
    for (const input of ['2(x+3) = 3(x-1)', '(x+1)(x-1) = x + 3', '3/(x+1) = 2/(x-1)', 'x + 1/x = 3']) {
      expect(interpret(input).detection?.solver.id).toBe('collect');
    }
  });
});
