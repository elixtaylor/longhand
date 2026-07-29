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
});
