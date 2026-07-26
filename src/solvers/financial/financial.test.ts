import { financialSolver } from './index';
import { sequencesSolver } from '../sequences';

const sol = (s: { solve: (i: string, m: string) => any }, input: string, method: string) => {
  const r = s.solve(input, method);
  expect(r.ok, `failed to solve "${input}"`).toBe(true);
  return r.ok ? r.solution : null!;
};

describe('financialSolver', () => {
  it('computes simple interest (I = Prt)', () => {
    // 5000 × 0.04 × 3 = 600
    const s = sol(financialSolver, '$5000 at 4% for 3 years simple', 'simple');
    expect(s.answerLatex).toContain('600.00');
    expect(s.answerLatex).toContain('5,600.00');
  });

  it('computes compound interest yearly', () => {
    // 5000 × 1.04³ = 5624.32
    const s = sol(financialSolver, '$5000 at 4% for 3 years compound', 'compound');
    expect(s.answerLatex).toContain('5,624.32');
  });

  it('respects monthly compounding', () => {
    // 5000 × (1 + 0.04/12)^36 = 5636.36
    const s = sol(financialSolver, '$5000 at 4% for 3 years compounded monthly', 'compound');
    expect(s.answerLatex).toContain('5,636.36');
  });

  it('computes reducing-balance depreciation', () => {
    // 20000 × 0.85^4 = 10440.13
    const s = sol(financialSolver, '$20000 at 15% for 4 years depreciation', 'depreciation');
    expect(s.answerLatex).toContain('10,440.13');
  });

  it('computes a loan repayment', () => {
    // P=300000, i=0.06/12, N=360 → 1798.65
    const s = sol(financialSolver, 'loan $300000 at 6% for 30 years repaid monthly', 'repayment');
    expect(s.answerLatex).toContain('1,798.65');
  });

  it('reads key=value form too', () => {
    const s = sol(financialSolver, 'P=1000, r=10, t=2 compound', 'compound');
    expect(s.answerLatex).toContain('1,210.00');
  });

  it('asks for missing figures', () => {
    expect(financialSolver.solve('interest on $5000', 'compound').ok).toBe(false);
  });
});

describe('sequencesSolver', () => {
  it('recognises an arithmetic list and finds the rule', () => {
    const s = sol(sequencesSolver, '3, 7, 11, 15', 'arithmetic');
    expect(s.methodName).toBe('Arithmetic sequence');
    expect(s.answerLatex).toContain('4n - 1'); // tn = 4n − 1
  });

  it('sums an arithmetic series', () => {
    // a=3,d=4,n=10 → S = 10/2(6+36) = 210
    const s = sol(sequencesSolver, 'a=3, d=4, n=10', 'arithmetic');
    expect(s.answerLatex).toContain('210');
  });

  it('recognises a geometric list', () => {
    const s = sol(sequencesSolver, '2, 6, 18, 54', 'arithmetic');
    expect(s.methodName).toBe('Geometric sequence');
  });

  it('finds the geometric nth term and sum', () => {
    // a=3,r=2,n=10 → t10 = 1536, S10 = 3069
    const s = sol(sequencesSolver, 'a=3, r=2, n=10', 'geometric');
    expect(s.answerLatex).toContain('1536');
    expect(s.answerLatex).toContain('3069');
  });

  it('gives the limiting sum when |r| < 1', () => {
    // a=8, r=0.5 → S∞ = 16
    const s = sol(sequencesSolver, 'a=8, r=0.5, n=5', 'geometric');
    expect(s.answerLatex).toContain('S_{\\infty} = 16');
  });

  it('rejects a list with no constant pattern', () => {
    expect(sequencesSolver.solve('1, 4, 9, 17', 'arithmetic').ok).toBe(false);
  });
});
