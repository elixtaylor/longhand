import { describe, expect, it } from 'vitest';
import { evaluateGraphExpression } from './GraphingWorkspace';

describe('graphing expression table', () => {
  it('evaluates growth, polynomial and trigonometric expressions against x', () => {
    expect(evaluateGraphExpression('100e^(0.05x)', 2)).toBeCloseTo(110.517, 2);
    expect(evaluateGraphExpression('x^2 - 4', -3)).toBe(5);
    expect(evaluateGraphExpression('sin(x)', Math.PI / 2)).toBeCloseTo(1, 8);
  });
});
