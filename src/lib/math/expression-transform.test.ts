import { describe, expect, it } from 'vitest';
import { evaluateExpr, parseExpr, toLatex } from './expr';
import {
  evaluateExpression,
  expandExpression,
  simplifyExpression,
} from './expression-transform';

function close(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(
    1e-8 * Math.max(1, Math.abs(expected)),
  );
}

describe('expression transformations', () => {
  it.each([
    'e^(1/2)(5 - 4e^(4/3))',
    '(x + 2)(x - 3)',
    '(x + 1)^3',
    '-(x - 4)',
    '(x^2 + 2x)/2',
    '2x + 3x - 4',
    'sqrt(8) + sqrt(18)',
  ])('preserves the value of %s while expanding and simplifying', (input) => {
    const original = parseExpr(input);
    const expanded = expandExpression(original).expression;
    const simplified = simplifyExpression(expanded).expression;

    for (const x of [-3.5, -1, 0, 2.25, 7]) {
      const expected = evaluateExpr(original, { x });
      if (!Number.isFinite(expected)) continue;
      close(evaluateExpr(expanded, { x }), expected);
      close(evaluateExpr(simplified, { x }), expected);
    }
  });

  it('does not discard the domain of a fractional nested power', () => {
    const result = simplifyExpression(parseExpr('(x^(1/2))^2')).expression;
    expect(toLatex(result)).not.toBe('x');
  });

  it('evaluates one visible operation at a time', () => {
    const result = evaluateExpression(parseExpr('2sin(pi/2) + abs(-3)'));
    expect(result.steps.length).toBeGreaterThan(4);
    expect(result.expression).toEqual({ t: 'num', v: 5 });
  });

  it('stops an expansion before it creates an unsafe number of terms', () => {
    expect(() => expandExpression(parseExpr('(x + 1)^100'))).toThrow(
      /too many|too many separate/i,
    );
  });
});
