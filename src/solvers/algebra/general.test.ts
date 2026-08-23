import { describe, expect, it } from 'vitest';
import { generalSolver } from './general';

describe('general equation fallback', () => {
  it('solves a transcendental equation numerically', () => {
    const result = generalSolver.solve('sin(x) = x/2', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.solution.answerLatex).toContain('x \\approx');
      expect(
        result.solution.steps.some((step) => step.latex?.includes('m_1')),
      ).toBe(true);
      expect(
        result.solution.steps.some((step) =>
          step.latex?.toLowerCase().includes('bisection'),
        ),
      ).toBe(false);
      const last = result.solution.steps[result.solution.steps.length - 1];
      expect(last?.latex).toContain('0');
    }
  });

  it('solves a nested radical equation', () => {
    const result = generalSolver.solve('sqrt(x + 1) = 3', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.solution.answerLatex).toContain('x \\approx 8');
  });

  it('finds a repeated root and roots outside the old search window', () => {
    const repeated = generalSolver.solve('(x - 2.13)^2 = 0', 'numerical');
    expect(repeated.ok).toBe(true);
    if (repeated.ok) {
      expect(repeated.solution.answerLatex).toContain('2.13');
      expect(
        repeated.solution.steps.some((step) =>
          step.note?.toLowerCase().includes('touches the x-axis'),
        ),
      ).toBe(true);
      expect(
        repeated.solution.steps.some((step) => step.latex?.includes('x_{m_1}')),
      ).toBe(true);
      expect(
        repeated.solution.steps.every(
          (step) => !step.latex?.includes('No sign-changing bracket'),
        ),
      ).toBe(true);
    }
    const wide = generalSolver.solve('x - 500 = 0', 'numerical');
    expect(wide.ok).toBe(true);
    if (wide.ok) {
      expect(wide.solution.answerLatex).toContain('500');
      expect(
        wide.solution.steps.some((step) => step.latex?.includes('f(500)')),
      ).toBe(true);
    }
  });

  it('keeps the no-root working readable when no bracket exists', () => {
    const result = generalSolver.solve('x^2 + 1 = 0', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.solution.steps.some((step) =>
          step.latex?.includes('No sign-changing interval'),
        ),
      ).toBe(true);
      expect(
        result.solution.steps.every(
          (step) => !step.latex?.includes('No sign-changing bracket'),
        ),
      ).toBe(true);
    }
  });

  it('evaluates a numeric advanced expression', () => {
    const result = generalSolver.solve('2sin(pi/2) + abs(-3)', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.solution.answerLatex).toBe('5');
  });

  it('shows both sides of a true numeric identity instead of only true', () => {
    const result = generalSolver.solve('ln(32e^5) = 5(ln2 + 1)', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.solution.answerLatex).not.toBe('\\text{true}');
      expect(result.solution.answerLatex).toContain('=');
      const last = result.solution.steps[result.solution.steps.length - 1];
      expect(last?.latex).toContain('=');
    }
  });

  it('rejects tangent discontinuities instead of reporting them as roots', () => {
    const result = generalSolver.solve('tan(x) = x', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const answer = result.solution.answerLatex ?? '';
      expect(answer).toContain('x \\approx 0');
      expect(answer).not.toMatch(/1\.5707|4\.7123|7\.8539/);
      expect(result.solution.steps.length).toBeLessThan(40);
    }
  });

  it('bounds the displayed working when an equation has many roots', () => {
    const result = generalSolver.solve('tan(x) + x = 0', 'numerical');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.solution.steps.length).toBeLessThan(40);
      expect(
        result.solution.steps[result.solution.steps.length - 1]?.note,
      ).toMatch(/validated|search found/i);
    }
  });
});
