import { describe, it, expect } from 'vitest';
import { reduceSolver } from './reduce';
import { interpret } from '../../lib/engine/run';

function solve(input: string) {
  const r = reduceSolver.solve(input, reduceSolver.defaultMethodId);
  if (!r.ok) throw new Error(`refused: ${r.error}`);
  return r.solution;
}

function answers(latex: string | undefined): number[] {
  return [...(latex ?? '').matchAll(/x\s*=\s*(-?\d*\.?\d+)/g)].map((m) => Number(m[1]));
}

describe('reducing before solving', () => {
  it('squares out sqrt(A) = sqrt(B)', () => {
    expect(answers(solve('sqrt(x+1) = sqrt(2x-3)').answerLatex)[0]).toBeCloseTo(4, 6);
  });

  it('squares out sqrt(A) = linear(x) and keeps only the genuine root', () => {
    // x+1 = x^2 has two algebraic roots, the golden ratio and its conjugate;
    // only the positive one satisfies the original equation once sqrt (which
    // is never negative) is put back — squaring must not report both.
    const found = answers(solve('sqrt(x+1) = x').answerLatex);
    expect(found).toHaveLength(1);
    expect(found[0]).toBeCloseTo((1 + Math.sqrt(5)) / 2, 6);

    const found2 = answers(solve('sqrt(2x+3) = x').answerLatex);
    expect(found2).toEqual([3]);
  });

  it('reports no solution when every algebraic root is extraneous', () => {
    // sqrt(x) = -3: squaring gives x = 9, but sqrt(9) = 3, not -3.
    const r = solve('sqrt(x) = -3');
    expect(r.answerLatex).toBeUndefined();
  });

  it('combines a sum of logarithms and solves the resulting equation', () => {
    const x = answers(solve('ln(x) + ln(x+1) = 2').answerLatex)[0];
    expect(Math.log(x) + Math.log(x + 1)).toBeCloseTo(2, 3);
  });

  it('discards a log solution that fails the domain (argument must be positive)', () => {
    // x(x+3) = e^1 has two algebraic roots; only the positive one keeps both
    // ln(x) and ln(x+3) defined.
    const found = answers(solve('ln(x+3) + ln(x) = 1').answerLatex);
    expect(found).toHaveLength(1);
    expect(found[0]).toBeGreaterThan(0);
  });

  it('takes logs of an exponential equation with different bases', () => {
    expect(answers(solve('2^x = 3^x').answerLatex)[0]).toBeCloseTo(0, 6);
    const x = answers(solve('2^(x+1) = 3^x').answerLatex)[0];
    expect(2 ** (x + 1)).toBeCloseTo(3 ** x, 3);
  });

  it('leaves a single-occurrence log equation to the solver that already owns it', () => {
    // ln(x) - ln(2) = 1 only has x inside one of the two logs — inverse.ts's
    // "undoing" narration is the right fit, not a two-log combination.
    expect(interpret('ln(x) - ln(2) = 1').detection?.solver.id).toBe('inverse');
  });

  it('refuses what does not match any of its patterns', () => {
    expect(reduceSolver.detect('3x + 4 = 10')).toBe(0);
    expect(reduceSolver.detect('x + y = 5')).toBe(0);
  });

  it('yields to inverse.ts for a single-occurrence sqrt, even though it could also square it out', () => {
    // reduce.ts's own detect() is honest that it *can* solve this (squaring
    // works whether x appears once or twice), but it scores below inverse.ts,
    // whose layer-by-layer narration is the better fit when x appears once.
    expect(interpret('sqrt(x) = 4').detection?.solver.id).toBe('inverse');
  });

  it('is picked up by auto-detection for genuine double-occurrence cases', () => {
    expect(interpret('sqrt(x+1) = sqrt(2x-3)').detection?.solver.id).toBe('reduce');
    expect(interpret('ln(x) + ln(x+1) = 2').detection?.solver.id).toBe('reduce');
    expect(interpret('2^x = 3^x').detection?.solver.id).toBe('reduce');
  });
});
