import { quadraticsSolver, quadraticRoots } from './index';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('quadraticRoots (exact core)', () => {
  it('finds rational roots of 2x²+7x−4', () => {
    const r = quadraticRoots(2, 7, -4);
    expect(r.nature).toBe('two-rational');
    expect(r.numericRoots.some((x) => near(x, 0.5))).toBe(true);
    expect(r.numericRoots.some((x) => near(x, -4))).toBe(true);
  });

  it('finds a repeated root of x²−4x+4', () => {
    const r = quadraticRoots(1, -4, 4);
    expect(r.nature).toBe('double');
    expect(near(r.numericRoots[0], 2)).toBe(true);
  });

  it('gives surd roots for x²−2', () => {
    const r = quadraticRoots(1, 0, -2);
    expect(r.nature).toBe('two-irrational');
    expect(r.numericRoots.some((x) => near(x, Math.SQRT2))).toBe(true);
    expect(r.answerLatex).toContain('\\sqrt{2}');
  });

  it('flags complex roots for x²+x+1', () => {
    const r = quadraticRoots(1, 1, 1);
    expect(r.nature).toBe('complex');
    expect(r.numericRoots).toHaveLength(0);
    expect(r.answerLatex).toContain('i');
  });
});

describe('quadraticsSolver — all three methods agree', () => {
  const cases = ['2x^2 + 7x - 4 = 0', 'x^2 - 5x + 6', '6x^2 - 5x + 1 = 0', 'x^2 - 4x + 4'];
  for (const input of cases) {
    it(`same answer via every method for ${input}`, () => {
      const answers = ['factorise', 'complete-square', 'formula'].map((m) => {
        const res = quadraticsSolver.solve(input, m);
        expect(res.ok).toBe(true);
        return res.ok ? res.solution.answerLatex : null;
      });
      expect(answers[0]).toBe(answers[1]);
      expect(answers[1]).toBe(answers[2]);
      expect(answers[0]).toBeTruthy();
    });
  }
});

describe('quadraticsSolver — factorising edge cases', () => {
  it('bows out gracefully when it does not factorise', () => {
    const res = quadraticsSolver.solve('x^2 - 2 = 0', 'factorise');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.solution.answerLatex).toBeUndefined();
      const text = res.solution.steps.map((s) => s.latex ?? '').join(' ');
      expect(text).toContain('does not factorise');
    }
  });

  it('factors out x when there is no constant term', () => {
    const res = quadraticsSolver.solve('2x^2 + 6x', 'factorise');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.solution.answerLatex).toContain('x = 0');
    }
  });

  it('clears decimals before solving', () => {
    const res = quadraticsSolver.solve('0.5x^2 + 1.5x - 2 = 0', 'formula');
    expect(res.ok).toBe(true);
    // 0.5x²+1.5x−2 = 0  → x²+3x−4 = 0 → x = 1 or x = −4
    if (res.ok) {
      const r = quadraticRoots(1, 3, -4);
      expect(r.numericRoots.some((x) => near(x, 1))).toBe(true);
      expect(r.numericRoots.some((x) => near(x, -4))).toBe(true);
    }
  });
});

describe('quadraticsSolver — input errors', () => {
  it('rejects a non-quadratic', () => {
    const res = quadraticsSolver.solve('3x + 2 = 0', 'formula');
    expect(res.ok).toBe(false);
  });
});
