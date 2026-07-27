import { describe, it, expect } from 'vitest';
import { absoluteSolver } from './absolute';
import { interpret } from '../../lib/engine/run';

function solve(input: string) {
  const r = absoluteSolver.solve(input, absoluteSolver.defaultMethodId);
  if (!r.ok) throw new Error(`refused: ${r.error}`);
  return r.solution;
}

function answers(latex: string | undefined): number[] {
  return [...(latex ?? '').matchAll(/x\s*=\s*(-?\d*\.?\d+)/g)].map((m) => Number(m[1]));
}

describe('absolute value equations', () => {
  it('splits |expr| = k into the two cases that give it', () => {
    expect(answers(solve('|x - 3| = 5').answerLatex).sort((a, b) => a - b)).toEqual([-2, 8]);
    expect(answers(solve('|2x + 1| = 7').answerLatex).sort((a, b) => a - b)).toEqual([-4, 3]);
    expect(answers(solve('abs(x) = 4').answerLatex).sort((a, b) => a - b)).toEqual([-4, 4]);
  });

  it('has exactly one case when k = 0', () => {
    expect(answers(solve('|x - 3| = 0').answerLatex)).toEqual([3]);
  });

  it('has no solution when k < 0, since a distance can never be negative', () => {
    const r = solve('|x - 3| = -5');
    expect(r.answerLatex).toBeUndefined();
    expect(r.steps[r.steps.length - 1]?.latex).toBe('\\text{No solution}');
  });

  it('splits |A| = |B| into A = B or A = -B', () => {
    expect(answers(solve('|2x+1| = |x-4|').answerLatex).sort((a, b) => a - b)).toEqual([-5, 1]);
  });

  it('reaches brackets inside the bars via term collecting', () => {
    // |2(x-1)| = 6  →  2(x-1) = 6  or  2(x-1) = -6  →  x = 4 or x = -2
    expect(answers(solve('|2(x-1)| = 6').answerLatex).sort((a, b) => a - b)).toEqual([-2, 4]);
  });

  it('solves |A| = C(x) and rejects a root where C goes negative', () => {
    // x+1 = 2x-1 gives x=2 (valid: RHS=3≥0); x+1 = -(2x-1) gives x=0, but
    // then RHS = 2(0)-1 = -1 — an absolute value can never equal a negative
    // number, so that root has to be dropped even though it solves the case
    // equation on its own.
    expect(answers(solve('|x+1| = 2x - 1').answerLatex)).toEqual([2]);
  });

  it('keeps both roots of |A| = C(x) when C stays non-negative at each', () => {
    expect(answers(solve('|2x-3| = x+3').answerLatex).sort((a, b) => a - b)).toEqual([0, 6]);
  });

  it('reports no solution when every case is extraneous against the domain', () => {
    // |x-5| = -x requires -x ≥ 0 (x ≤ 0); the only algebraic candidate is
    // x = 2.5, which fails that check, and the other case is a contradiction.
    const r = solve('|x-5| = -x');
    expect(r.answerLatex).toBeUndefined();
  });

  it('refuses input that is not an absolute-value equation', () => {
    expect(absoluteSolver.detect('3x + 4 = 10')).toBe(0);
    expect(absoluteSolver.detect('x^2 - 5x + 6 = 0')).toBe(0);
  });

  it('is picked up by auto-detection', () => {
    expect(interpret('|x - 3| = 5').detection?.solver.id).toBe('absolute');
  });
});
