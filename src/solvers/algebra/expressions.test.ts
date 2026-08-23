import { describe, expect, it } from 'vitest';
import { detectSolver } from '../../lib/engine/registry';
import { expressionsSolver } from './expressions';

const SAMPLE = 'e^(1/2) (5-4e^(4/3))';

describe('worked expressions', () => {
  it('routes a free-standing exponential expression to the expression engine', () => {
    expect(detectSolver(SAMPLE)?.solver.id).toBe('expressions');
  });

  it('expands, applies the index law and finishes with a decimal check', () => {
    const result = expressionsSolver.solve(SAMPLE, 'both');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lines = result.solution.steps.map((step) => step.latex ?? '');
    expect(lines.length).toBeGreaterThanOrEqual(5);
    expect(lines.some((line) => line.includes('5e^{\\dfrac{1}{2}}'))).toBe(
      true,
    );
    expect(lines.some((line) => line.includes('e^{\\dfrac{11}{6}}'))).toBe(
      true,
    );
    expect(lines[lines.length - 1]).toContain('\\approx');
    expect(result.solution.answerLatex).toContain(
      '5e^{\\dfrac{1}{2}} - 4e^{\\dfrac{11}{6}}',
    );
  });

  it('keeps Expand, Simplify and Both as genuinely different operations', () => {
    const expanded = expressionsSolver.solve(SAMPLE, 'expand');
    const simplified = expressionsSolver.solve(SAMPLE, 'simplify');
    const both = expressionsSolver.solve(SAMPLE, 'both');
    expect(expanded.ok && expanded.solution.answerLatex).not.toBe(
      both.ok && both.solution.answerLatex,
    );
    expect(simplified.ok && simplified.solution.answerLatex).not.toBe(
      both.ok && both.solution.answerLatex,
    );
  });

  it('fully expands a polynomial and collects its like terms', () => {
    const result = expressionsSolver.solve('(x + 2)(x - 3)', 'both');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.solution.answerLatex).toBe('x^{2} - x - 6');
  });

  it('simplifies every surd in a compound expression before combining terms', () => {
    const sum = expressionsSolver.solve('sqrt(8) + sqrt(18)', 'both');
    expect(sum.ok).toBe(true);
    if (sum.ok) expect(sum.solution.answerLatex).toContain('5\\sqrt{2}');

    const product = expressionsSolver.solve('sqrt(2) * sqrt(8)', 'both');
    expect(product.ok).toBe(true);
    if (product.ok) expect(product.solution.answerLatex).toBe('4');
  });

  it('shows at least two lines even when the selected operation is a no-op', () => {
    const result = expressionsSolver.solve('e^(1/2)', 'expand');
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.solution.steps.length).toBeGreaterThanOrEqual(2);
  });

  it('refuses an undefined real expression instead of printing NaN', () => {
    const result = expressionsSolver.solve('sqrt(-1)', 'both');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('not defined');

    const indeterminate = expressionsSolver.solve('0^0', 'both');
    expect(indeterminate.ok).toBe(false);
    if (!indeterminate.ok)
      expect(indeterminate.error).toContain('indeterminate');
  });
});
