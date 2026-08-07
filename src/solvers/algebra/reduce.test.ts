import { describe, it, expect } from 'vitest';
import { reduceSolver } from './reduce';
import { interpret, runWorked } from '../../lib/engine/run';

function solve(input: string) {
  const r = reduceSolver.solve(input, reduceSolver.defaultMethodId);
  if (!r.ok) throw new Error(`refused: ${r.error}`);
  return r.solution;
}

function answers(latex: string | undefined): number[] {
  return [...(latex ?? '').matchAll(/x\s*=\s*(-?\d*\.?\d+)/g)].map((m) =>
    Number(m[1]),
  );
}

describe('reducing before solving', () => {
  it('squares out sqrt(A) = sqrt(B)', () => {
    expect(answers(solve('sqrt(x+1) = sqrt(2x-3)').answerLatex)[0]).toBeCloseTo(
      4,
      6,
    );
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

  it('uses log laws before solving powers inside logarithms', () => {
    const solution = solve('ln(x^2) + ln(x) = 4');
    expect(solution.answerLatex).toBe('x = e^{\\frac{4}{3}}');
    expect(
      solution.steps.some((step) => step.latex?.includes('\\approx')),
    ).toBe(true);
    expect(solution.steps.some((step) => step.latex?.includes('x^{3}'))).toBe(
      true,
    );
    expect(solution.steps.some((step) => step.latex?.includes('e^{4}'))).toBe(
      true,
    );
  });

  it('substitutes u = ln x when the logarithm itself is squared', () => {
    const solution = solve('(lnx)^2 = 2lnx + 3');
    expect(solution.answerLatex).toBe(
      'x = e^{3} \\quad\\text{or}\\quad x = e^{-1}',
    );
    expect(
      solution.steps.some((step) => step.latex?.includes('u^{2} - 2u - 3 = 0')),
    ).toBe(true);
    expect(solution.steps.some((step) => step.latex?.includes('u = 3'))).toBe(
      true,
    );
    expect(solution.steps.some((step) => step.latex?.includes('e^{3}'))).toBe(
      true,
    );
    expect(solution.steps.some((step) => step.latex?.includes('e^{-1}'))).toBe(
      true,
    );
  });

  it('takes logs of an exponential equation with different bases', () => {
    expect(solve('2^x = 3^x').answerLatex).toBe('x = 0');
    const exact = solve('2^(x+1) = 3^x').answerLatex;
    expect(exact).toContain('\\ln');
    expect(exact).not.toContain('bisection');
  });

  it('shows exact symbolic working for affine exponents before using decimals', () => {
    expect(interpret('4^(1-x)=3^(2x+1)').detection?.solver.id).toBe('reduce');
    const worked = runWorked('4^(1-x)=3^(2x+1)');
    expect(worked.parts[0]?.solver.id).toBe('reduce');
    expect(
      worked.parts[0]?.result.ok &&
        worked.parts[0].result.solution.steps.some((step) =>
          step.latex?.includes('bisection'),
        ),
    ).toBe(false);
    const s = solve('4^(1-x)=3^(2x+1)');
    const lines = s.steps.map((step) => step.latex ?? '');
    expect(lines).toContain('\\ln 4 - x\\ln 4 = 2x\\ln 3 + \\ln 3');
    expect(lines).toContain('-x\\ln 4 - 2x\\ln 3 = \\ln 3 - \\ln 4');
    expect(lines).toContain(
      'x\\left(-\\ln 4 - 2\\ln 3\\right) = \\ln 3 - \\ln 4',
    );
    expect(lines).toContain('x = \\dfrac{\\ln 4 - \\ln 3}{\\ln 4 + 2\\ln 3}');
    expect(lines).toContain(
      'x = \\dfrac{\\ln\\left(\\dfrac{4}{3}\\right)}{\\ln\\left(4 \\cdot 3^{2}\\right)}',
    );
    expect(lines).toContain(
      'x = \\dfrac{\\ln\\left(\\dfrac{4}{3}\\right)}{\\ln\\left(36\\right)}',
    );
    expect(lines).toContain('\\ln 4 = 1.386294, \\qquad \\ln 3 = 1.098612');
    expect(lines[lines.length - 1]).toContain('0.080279');
    expect(s.answerLatex).toBe(
      'x = \\dfrac{\\ln\\left(\\dfrac{4}{3}\\right)}{\\ln\\left(36\\right)}',
    );
  });

  it('shows the power-law expansion and the resulting linear equation, not just the answer', () => {
    // 2^(x+1) = 3^(x-1) used to jump straight from "take logs" to the answer,
    // skipping the actual algebra — same underlying gap as the quadratic and
    // log-fraction cases: a real working needs every step shown, not just
    // the ones one technique covers.
    const s = solve('2^(x+1)=3^(x-1)');
    expect(s.steps.length).toBeGreaterThanOrEqual(4);
    expect(s.steps.some((step) => step.latex?.includes('\\ln'))).toBe(true);
    expect(s.steps.some((step) => /^x\\left\(/.test(step.latex ?? ''))).toBe(
      true,
    );
    expect(s.answerLatex).toContain('\\ln');
    expect(s.steps.some((step) => step.latex?.includes('\\ln'))).toBe(true);
  });

  it('uses base-10 logarithms throughout exponential working when selected', () => {
    const result = reduceSolver.solve('4^(1-x)=3^(2x+1)', 'reduce', {
      logarithmBase: 'common',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.solution.steps.map((step) => step.latex ?? '');
    expect(lines).toContain('\\log 4 - x\\log 4 = 2x\\log 3 + \\log 3');
    expect(lines).toContain(
      'x = \\dfrac{\\log\\left(\\dfrac{4}{3}\\right)}{\\log\\left(36\\right)}',
    );
    expect(lines.some((line) => line.includes('\\ln'))).toBe(false);
    expect(lines[lines.length - 1]).toContain('0.080279');
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
    expect(interpret('sqrt(x+1) = sqrt(2x-3)').detection?.solver.id).toBe(
      'reduce',
    );
    expect(interpret('ln(x) + ln(x+1) = 2').detection?.solver.id).toBe(
      'reduce',
    );
    expect(interpret('ln(x^2) + ln(x) = 4').detection?.solver.id).toBe(
      'reduce',
    );
    expect(interpret('(lnx)^2 = 2lnx + 3').detection?.solver.id).toBe('reduce');
    expect(interpret('2^x = 3^x').detection?.solver.id).toBe('reduce');
  });
});
