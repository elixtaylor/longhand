import { statisticsSolver } from './descriptive';
import { distributionsSolver } from './distributions';

const sol = (s: { solve: (i: string, m: string) => any }, input: string, method: string) => {
  const r = s.solve(input, method);
  expect(r.ok, `failed to solve "${input}": ${r.ok ? '' : r.error}`).toBe(true);
  return r.ok ? r.solution : null!;
};

describe('statisticsSolver', () => {
  it('finds the mean and median', () => {
    // 4,8,15,16,23,42 → mean 18, median (15+16)/2 = 15.5
    const s = sol(statisticsSolver, '4, 8, 15, 16, 23, 42', 'centre');
    const text = JSON.stringify(s.steps);
    expect(text).toContain('18');
    expect(text).toContain('15.5');
  });

  it('finds the standard deviation', () => {
    // 2,4,4,4,5,5,7,9 → population σ = 2, sample s = 2.1381
    const s = sol(statisticsSolver, '2, 4, 4, 4, 5, 5, 7, 9', 'spread');
    const text = JSON.stringify(s.steps);
    expect(text).toContain('\\\\sigma = 2');
    expect(text).toContain('2.1381');
  });

  it('builds the five-number summary', () => {
    // 1..9 → min 1, Q1 3 (median of 1,2,3,4), median 5, Q3 7, max 9
    const s = sol(statisticsSolver, '1, 2, 3, 4, 5, 6, 7, 8, 9', 'five-number');
    expect(s.answerLatex).toBe('1,\\; 2.5,\\; 5,\\; 7.5,\\; 9');
  });

  it('reports no mode when every value is unique', () => {
    const s = sol(statisticsSolver, '1, 2, 3, 4', 'centre');
    expect(JSON.stringify(s.steps)).toContain('no mode');
  });

  it('leaves a clean arithmetic run to the sequences topic', () => {
    // A patterned list is far more likely to be a sequence question.
    expect(statisticsSolver.detect('3, 7, 11, 15')).toBeLessThan(0.8);
    expect(statisticsSolver.detect('4, 8, 15, 16, 23, 42')).toBeGreaterThan(0.8);
  });
});

describe('distributionsSolver', () => {
  it('computes a binomial probability', () => {
    // P(X=3) for Bin(10, 0.5) = 120/1024 = 0.117188
    const s = sol(distributionsSolver, 'binomial n=10, p=0.5, x=3', 'binomial');
    expect(s.answerLatex).toContain('0.117188');
  });

  it('describes a binomial distribution without x', () => {
    // mean = 5, sd = sqrt(2.5) = 1.5811
    const s = sol(distributionsSolver, 'binomial n=10, p=0.5', 'binomial');
    expect(s.answerLatex).toContain('5');
    expect(s.answerLatex).toContain('1.5811');
  });

  it('standardises a normal value', () => {
    // z = (120-100)/15 = 1.3333 → Φ ≈ 0.9088
    const s = sol(distributionsSolver, 'normal mean=100, sd=15, x=120', 'normal');
    expect(s.answerLatex).toContain('0.908');
  });

  it('knows the standard normal midpoint', () => {
    const s = sol(distributionsSolver, 'normal mean=0, sd=1, x=0', 'normal');
    expect(s.answerLatex).toContain('0.5');
  });

  it('builds a 95% confidence interval', () => {
    // 50 ± 1.96 × 8/10 = 50 ± 1.568
    const s = sol(distributionsSolver, 'confidence mean=50, sd=8, n=100', 'confidence');
    expect(s.answerLatex).toContain('48.432');
    expect(s.answerLatex).toContain('51.568');
  });

  it('rejects an impossible probability', () => {
    expect(distributionsSolver.solve('binomial n=10, p=1.5, x=3', 'binomial').ok).toBe(false);
  });
});
