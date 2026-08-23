import { statisticsSolver } from './descriptive';
import { distributionsSolver } from './distributions';

const sol = (
  s: { solve: (i: string, m: string) => any },
  input: string,
  method: string,
) => {
  const r = s.solve(input, method);
  expect(r.ok, `failed to solve "${input}": ${r.ok ? '' : r.error}`).toBe(true);
  return r.ok ? r.solution : null!;
};

describe('statisticsSolver', () => {
  it('keeps the centre-only answer to measures actually worked out', () => {
    const result = statisticsSolver.solve('1, 2, 2, 4', 'centre');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.solution.answerLatex).toContain('\\text{mode} = 2');
      expect(result.solution.answerLatex).not.toContain('s =');
    }
  });
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

  it('does not mistake statistical labels for data values', () => {
    const five = sol(
      statisticsSolver,
      '5-number summary of 1, 2, 3, 4, 5',
      'five-number',
    );
    expect(five.answerLatex).toBe('1,\\; 1.5,\\; 3,\\; 4.5,\\; 5');

    const q1 = sol(statisticsSolver, 'find Q1 for 2, 4, 6, 8', 'five-number');
    expect(q1.answerLatex).toBe('2,\\; 3,\\; 5,\\; 7,\\; 8');
  });

  it('rejects non-finite data instead of printing invalid working', () => {
    expect(statisticsSolver.solve('1e309, 2, 3, 4', 'summary').ok).toBe(false);
  });

  it('reports no mode when every value is unique', () => {
    const s = sol(statisticsSolver, '1, 2, 3, 4', 'centre');
    expect(JSON.stringify(s.steps)).toContain('no mode');
  });

  it('leaves a clean arithmetic run to the sequences topic', () => {
    // A patterned list is far more likely to be a sequence question.
    expect(statisticsSolver.detect('3, 7, 11, 15')).toBeLessThan(0.8);
    expect(statisticsSolver.detect('4, 8, 15, 16, 23, 42')).toBeGreaterThan(
      0.8,
    );
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
    const s = sol(
      distributionsSolver,
      'normal mean=100, sd=15, x=120',
      'normal',
    );
    expect(s.answerLatex).toContain('0.908');
  });

  it('knows the standard normal midpoint', () => {
    const s = sol(distributionsSolver, 'normal mean=0, sd=1, x=0', 'normal');
    expect(s.answerLatex).toContain('0.5');
  });

  it('builds a 95% confidence interval', () => {
    // 50 ± 1.96 × 8/10 = 50 ± 1.568
    const s = sol(
      distributionsSolver,
      'confidence mean=50, sd=8, n=100',
      'confidence',
    );
    expect(s.answerLatex).toContain('48.432');
    expect(s.answerLatex).toContain('51.568');
  });

  it('supports valid non-standard confidence levels', () => {
    const s = sol(
      distributionsSolver,
      'confidence mean=50, sd=8, n=100, confidence=92',
      'confidence',
    );
    expect(s.derivedValues?.confidence).toBe(92);
    expect(s.answerLatex).toContain('48.5995');
    expect(s.answerLatex).toContain('51.4005');
  });

  it('finds a sampling distribution and standard error', () => {
    const s = sol(
      distributionsSolver,
      'sampling mean=50, sd=8, n=100',
      'sampling',
    );
    expect(s.answerLatex).toContain('0.8');
  });

  it('finds a probability between two normal bounds', () => {
    const s = sol(
      distributionsSolver,
      'normal between lower=80 and upper=120, mean=100, sd=15',
      'normal-interval',
    );
    expect(s.answerLatex).toContain('0.817');
  });

  it('labels one-sided normal intervals in the correct direction', () => {
    const below = sol(
      distributionsSolver,
      'normal below 120, mean=100, sd=15',
      'normal-interval',
    );
    expect(below.answerLatex).toContain('X \\le 120');
    const above = sol(
      distributionsSolver,
      'normal above 80, mean=100, sd=15',
      'normal-interval',
    );
    expect(above.answerLatex).toContain('X \\ge 80');
  });

  it('rejects an impossible probability', () => {
    expect(
      distributionsSolver.solve('binomial n=10, p=1.5, x=3', 'binomial').ok,
    ).toBe(false);
  });

  it('rejects sample sizes that are not positive whole numbers', () => {
    expect(
      distributionsSolver.solve('sampling mean=50, sd=8, n=2.5', 'sampling').ok,
    ).toBe(false);
    expect(
      distributionsSolver.solve('confidence mean=50, sd=8, n=2.5', 'confidence')
        .ok,
    ).toBe(false);
  });

  it('rejects non-finite distribution inputs instead of printing undefined', () => {
    expect(
      distributionsSolver.solve('normal mean=1e309, sd=1, x=2', 'normal').ok,
    ).toBe(false);
    expect(
      distributionsSolver.solve('sampling mean=0, sd=1e309, n=10', 'sampling')
        .ok,
    ).toBe(false);
    expect(
      distributionsSolver.solve(
        'confidence mean=0, sd=1e309, n=10',
        'confidence',
      ).ok,
    ).toBe(false);
  });

  it('rejects finite inputs whose derived distribution values overflow', () => {
    expect(
      distributionsSolver.solve(
        'confidence mean=1e308, sd=1e308, n=1, confidence=95',
        'confidence',
      ).ok,
    ).toBe(false);
    expect(
      distributionsSolver.solve('normal mean=-1e308, sd=1, x=1e308', 'normal')
        .ok,
    ).toBe(false);
    expect(
      distributionsSolver.solve(
        'sampling mean=-1e308, sd=1, n=10, xbar=1e308',
        'sampling',
      ).ok,
    ).toBe(false);
  });

  it('requires a safely representable binomial trial count', () => {
    expect(
      distributionsSolver.solve(
        'binomial n=999999999999999999, p=0.5',
        'binomial',
      ).ok,
    ).toBe(false);
  });

  it('refuses binomial sizes that would overflow the coefficient', () => {
    const result = distributionsSolver.solve(
      'binomial n=5000, p=0.5, x=2500',
      'binomial',
    );
    expect(result.ok).toBe(false);
  });
});
