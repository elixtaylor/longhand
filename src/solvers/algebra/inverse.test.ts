import { describe, it, expect } from 'vitest';
import { inverseSolver } from './inverse';
import { interpret } from '../../lib/engine/run';
import { parseExpr, evaluateExpr } from '../../lib/math/expr';

/**
 * The answers here are checked by putting them back into the question, not by
 * comparing them with what the solver printed last time. A test that only
 * records the current output would have passed happily throughout the period
 * when nineteen of these twenty equations were not recognised at all.
 */

function solve(input: string) {
  const r = inverseSolver.solve(input, 'undo');
  if (!r.ok) throw new Error(`refused: ${r.error}`);
  return r.solution;
}

/** The numbers in "x = 1, \quad x = -7". */
function answers(latex: string | undefined): number[] {
  return [...(latex ?? '').matchAll(/x\s*=\s*(-?\d*\.?\d+)/g)].map((m) => Number(m[1]));
}

/** Substitute a solution back into the original equation and compare sides. */
function satisfies(equation: string, x: number): boolean {
  const [lhs, rhs] = equation.split('=');
  const left = evaluateExpr(parseExpr(lhs), { x });
  const right = evaluateExpr(parseExpr(rhs), { x });
  return Math.abs(left - right) < 1e-4 * Math.max(1, Math.abs(left), Math.abs(right));
}

/**
 * The same check for a trig answer, which is in degrees while the expression
 * engine counts in radians. Converting x alone is not enough: in cos(x + 30)
 * the 30 is degrees too, so the whole angle has to be measured first and
 * converted second.
 */
function satisfiesInDegrees(equation: string, x: number): boolean {
  const [lhs, rhs] = equation.split('=');
  const call = parseExpr(lhs);
  if (call.t !== 'fn') throw new Error('expected a trig call on the left');
  const radians = (evaluateExpr(call.a, { x }) * Math.PI) / 180;
  const left = call.name === 'sin' ? Math.sin(radians) : call.name === 'cos' ? Math.cos(radians) : Math.tan(radians);
  return Math.abs(left - evaluateExpr(parseExpr(rhs))) < 1e-6;
}

describe('solving by undoing', () => {
  /* Every one of these was unrecognised before: each wraps one topic inside
   * another, which is exactly the case shape-matching solvers cannot reach. */
  const equations = [
    'ln(x+5) = 5',
    'ln(2x-1) = 3',
    'ln(x) + ln(2) = 3',
    'log(x+1) = 2',
    'log2(x+1) = 5',
    '2^(x+1) = 32',
    '5^(2x) = 125',
    '2e^x + 1 = 9',
    'e^(x-1) = 4',
    'sqrt(x) = 4',
    'sqrt(x-3) = 4',
    'sqrt(2x+1) = 5',
    '2(x+3) = 10',
    '3(x-4) = 12',
    'x/4 + 2 = 7',
    '(2x+1)/3 = 5',
    '10 - x/3 = 4',
    '1/(x+2) = 5',
    '3/x = 12',
    'x^3 = 27',
    '(x+1)^3 = 8',
    '5 - x = 2',
    '-x + 4 = 1',
  ];

  it.each(equations)('%s — the answer satisfies the equation', (equation) => {
    const found = answers(solve(equation).answerLatex);
    expect(found.length).toBeGreaterThan(0);
    for (const x of found) expect(satisfies(equation, x)).toBe(true);
  });

  it.each([
    ['ln(x+5) = 5', 143.413159],
    ['2(x+3) = 10', 2],
    ['x/4 + 2 = 7', 20],
    ['(2x+1)/3 = 5', 7],
    ['2^(x+1) = 32', 4],
    ['log(x+1) = 2', 99],
    ['sqrt(x-3) = 4', 19],
    ['x^3 = 27', 3],
    ['1/(x+2) = 5', -1.8],
    ['3/x = 12', 0.25],
  ])('%s gives x = %d', (equation, expected) => {
    expect(answers(solve(equation).answerLatex)).toEqual([expected]);
  });

  it('keeps both roots of an even power', () => {
    expect(answers(solve('(x+3)^2 = 16').answerLatex)).toEqual([1, -7]);
    expect(answers(solve('(x-2)^2 = 9').answerLatex)).toEqual([5, -1]);
    // Dropping the negative root is the classic slip; check it really is there.
    for (const x of answers(solve('(x+3)^2 = 16').answerLatex)) {
      expect(satisfies('(x+3)^2 = 16', x)).toBe(true);
    }
  });

  it('reports a repeated root once, not twice', () => {
    // Zero is its own negative, so the ± branches meet. Printing both would
    // claim two solutions where the curve touches the axis at one point.
    expect(solve('(x+1)^2 = 0').answerLatex).toBe('x = -1');
    expect(solve('e^(x^2) = 1').answerLatex).toBe('x = 0');
  });

  it('gives every solution of a compound-angle trig equation, not just the first', () => {
    const found = answers(solve('sin(2x) = 0.5').answerLatex);
    expect(found).toEqual([15, 75, 195, 255]);
    for (const x of found) expect(satisfiesInDegrees('sin(2x) = 0.5', x)).toBe(true);

    const cos = answers(solve('cos(x+30) = 0.5').answerLatex);
    expect(cos).toEqual([30, 270]);
    for (const x of cos) expect(satisfiesInDegrees('cos(x+30) = 0.5', x)).toBe(true);

    // Nothing outside one revolution, and nothing inside it missed.
    for (const x of found) expect(x).toBeGreaterThanOrEqual(0);
    for (const x of found) expect(x).toBeLessThan(360);
  });

  it('shows the step that justifies the next line, rather than jumping', () => {
    const steps = solve('ln(x+5) = 5').steps.map((s) => s.latex ?? '');
    // Raising both sides under an e is the move that makes the cancellation
    // obvious; going straight to x = e^5 - 5 hides it.
    expect(steps.some((l) => l.includes('e^{\\,\\ln'))).toBe(true);
    expect(steps.some((l) => /x \+ 5 = e\^\{5\}/.test(l))).toBe(true);
    expect(steps.some((l) => l.includes('- 5 = e^{5} - 5'))).toBe(true);
  });

  it('proves there is no solution instead of inventing one', () => {
    for (const equation of ['e^x = -3', 'sqrt(x) = -2', '2^x = -8', '(x+1)^2 = -4']) {
      const r = inverseSolver.solve(equation, 'undo');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.solution.answerLatex).toBeUndefined();
      expect(r.solution.steps[r.solution.steps.length - 1].latex).toBe('\\text{No real solutions}');
    }
    // sin never leaves [-1, 1], whatever is inside it.
    const r = inverseSolver.solve('sin(2x) = 3', 'undo');
    expect(r.ok && r.solution.answerLatex).toBeUndefined();
  });

  it('refuses what it cannot do, rather than answering a different question', () => {
    // x on both sides needs terms collected, not layers undone.
    expect(inverseSolver.detect('2x + 1 = x + 5')).toBe(0);
    // Two unknowns, and a quadratic, are other topics.
    expect(inverseSolver.detect('x^2 + 3x + 2 = 0')).toBe(0);
    expect(inverseSolver.detect('ax + b = c')).toBe(0);
    expect(inverseSolver.detect('x + y = 5')).toBe(0);
    // Not an equation at all.
    expect(inverseSolver.detect('differentiate x^2')).toBe(0);
    expect(inverseSolver.detect('3x + 4 = 10; x - y = 2')).toBe(0);
  });

  it('leaves questions that already have a topic of their own', () => {
    // Scoring below the shape-matching solvers keeps their tailored working.
    const kept: [string, string][] = [
      ['3x + 4 = 10', 'linear'],
      ['5 - 2x = 1', 'linear'],
      ['ln x = 5', 'logarithms'],
      ['2^x = 32', 'logarithms'],
      ['log2(x) = 3', 'logarithms'],
      ['sin x = 0.5', 'trig-equations'],
      ['x^2 - 5x + 6 = 0', 'quadratics'],
    ];
    for (const [input, id] of kept) {
      expect(interpret(input).detection?.solver.id).toBe(id);
    }
  });

  it('picks up the questions nothing else would take', () => {
    for (const input of ['ln(x+5) = 5', '2(x+3) = 10', 'sqrt(x-3) = 4', 'x/4 + 2 = 7']) {
      expect(interpret(input).detection?.solver.id).toBe('inverse');
    }
  });
});
