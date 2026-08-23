import { describe, expect, it } from 'vitest';
import { functionsSolver } from './functions';

describe('functions and sketching', () => {
  it('sketches common non-polynomial functions from their key features', () => {
    for (const input of [
      'sketch y = sin x',
      'graph y = e^x',
      'sketch y = 1/x',
    ]) {
      const result = functionsSolver.solve(input, 'features');
      expect(result.ok, input).toBe(true);
      if (result.ok) {
        expect(
          result.solution.steps.some((step) => step.visual?.kind === 'curve'),
        ).toBe(true);
      }
    }
  });

  it('classifies a flat even-power turning point with a sign test', () => {
    const result = functionsSolver.solve('sketch y = x^4', 'calculus');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const working = result.solution.steps
        .map((step) => `${step.note ?? ''} ${step.latex ?? ''}`)
        .join(' ');
      expect(working).toContain('a minimum');
      expect(working).not.toContain('possible stationary inflection');
    }
  });

  it('keeps a stationary cubic point as an inflection', () => {
    const result = functionsSolver.solve('sketch y = x^3', 'calculus');
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(JSON.stringify(result.solution.steps)).toContain(
        'stationary point of inflection',
      );
  });

  it('rejects coefficients that cannot be plotted safely', () => {
    const huge = `1${'0'.repeat(400)}`;
    expect(functionsSolver.solve(`sketch y = ${huge}x^2`, 'features').ok).toBe(
      false,
    );
  });
});
