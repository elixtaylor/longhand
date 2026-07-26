import { multiplicationSolver } from './multiplication';
import { divisionSolver } from './division';
import { fractionsSolver } from './fractions';

const ans = (s: { solve: (i: string, m: string) => any }, input: string, method: string) => {
  const r = s.solve(input, method);
  return r.ok ? r.solution.answerLatex : undefined;
};

describe('multiplicationSolver', () => {
  it('multiplies via the grid method', () => {
    expect(ans(multiplicationSolver, '234 × 56', 'grid')).toBe('13104');
  });
  it('agrees between grid and column', () => {
    expect(ans(multiplicationSolver, '234 × 56', 'grid')).toBe(
      ans(multiplicationSolver, '234 × 56', 'column'),
    );
  });
  it('handles a negative factor', () => {
    expect(ans(multiplicationSolver, '-3 * 4', 'grid')).toBe('-12');
  });
});

describe('divisionSolver', () => {
  it('divides exactly (all methods agree)', () => {
    expect(ans(divisionSolver, '864 ÷ 24', 'short')).toBe('36');
    expect(ans(divisionSolver, '864 ÷ 24', 'long')).toBe('36');
    expect(ans(divisionSolver, '864 ÷ 24', 'chunking')).toBe('36');
  });
  it('reports a remainder', () => {
    expect(ans(divisionSolver, '100 / 7', 'short')).toBe('14 \\text{ remainder } 2');
    expect(ans(divisionSolver, '100 / 7', 'chunking')).toBe('14 \\text{ remainder } 2');
  });
  it('rejects division by zero', () => {
    expect(divisionSolver.solve('5 / 0', 'short').ok).toBe(false);
  });
});

describe('fractionsSolver', () => {
  it('adds with a common denominator', () => {
    expect(ans(fractionsSolver, '3/4 + 1/6', 'standard')).toBe('\\frac{11}{12}');
  });
  it('subtracts', () => {
    expect(ans(fractionsSolver, '1/2 - 1/3', 'standard')).toBe('\\frac{1}{6}');
  });
  it('multiplies and simplifies', () => {
    expect(ans(fractionsSolver, '2/3 × 5/7', 'standard')).toBe('\\frac{10}{21}');
    expect(ans(fractionsSolver, '2/4 × 2/1', 'standard')).toBe('1');
  });
  it('divides by the reciprocal', () => {
    expect(ans(fractionsSolver, '3/4 ÷ 1/2', 'standard')).toBe('\\frac{3}{2}');
  });
  it('reduces to a whole number', () => {
    expect(ans(fractionsSolver, '1/2 + 1/2', 'standard')).toBe('1');
  });
});
