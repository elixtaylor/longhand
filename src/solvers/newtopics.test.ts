import { percentageSolver } from './arithmetic/percentages';
import { indicesSolver } from './algebra/indices';
import { inequalitySolver } from './algebra/inequalities';
import { functionsSolver } from './algebra/functions';
import { probabilitySolver } from './statistics/probability';
import { countingSolver } from './statistics/counting';
import { networksSolver } from './networks';
import { ratesSolver } from './calculus/rates';
import type { Solver } from '../lib/engine/types';

const ans = (s: Solver, input: string, method = s.defaultMethodId) => {
  const r = s.solve(input, method);
  return r.ok ? r.solution.answerLatex : undefined;
};

describe('percentages', () => {
  it('finds a percentage of an amount', () => {
    expect(ans(percentageSolver, '20% of 150')).toBe('30');
  });
  it('works with "of" stripped by the language layer', () => {
    expect(ans(percentageSolver, '20% 150')).toBe('30');
  });
  it('agrees between the decimal and unitary methods', () => {
    expect(ans(percentageSolver, '20% of 150', 'decimal')).toBe(ans(percentageSolver, '20% of 150', 'unitary'));
  });
  it('increases by a percentage', () => {
    expect(ans(percentageSolver, 'increase 80 by 15%')).toBe('92');
  });
  it('decreases by a percentage', () => {
    expect(ans(percentageSolver, 'decrease 200 by 10%')).toBe('180');
  });
  it('expresses one number as a percentage of another', () => {
    expect(ans(percentageSolver, '30 as a percentage of 150')).toBe('20\\%');
  });
  it('reverses a percentage increase', () => {
    // 80 increased by 10% is 88, so working back must give 80
    expect(ans(percentageSolver, 'after a 10% increase the price is 88')).toBe('80');
  });
  it('does not claim compound-interest problems', () => {
    expect(percentageSolver.detect('$5000 at 4% for 3 years compound')).toBe(0);
  });
});

describe('indices & surds', () => {
  it('simplifies a surd', () => {
    expect(ans(indicesSolver, 'sqrt 48')).toBe('4\\sqrt{3}');
  });
  it('resolves a perfect square', () => {
    expect(ans(indicesSolver, 'sqrt 49')).toBe('7');
  });
  it('leaves a square-free surd alone', () => {
    expect(ans(indicesSolver, 'sqrt 7')).toBe('\\sqrt{7}');
  });
  it('rationalises a denominator', () => {
    // 1/√2 = √2/2
    expect(ans(indicesSolver, '1/sqrt 2', 'rationalise')).toBe('\\dfrac{\\sqrt{2}}{2}');
  });
  it('applies the multiplication index law', () => {
    expect(ans(indicesSolver, '2^3 × 2^4')).toBe('2^{7}');
  });
  it('applies the division index law', () => {
    expect(ans(indicesSolver, '5^6 / 5^2')).toBe('5^{4}');
  });
  it('applies the power-of-a-power law', () => {
    expect(ans(indicesSolver, '(3^2)^4')).toBe('3^{8}');
  });
});

describe('inequalities', () => {
  it('solves a linear inequality', () => {
    expect(ans(inequalitySolver, '3x + 2 > 8')).toBe('x > 2');
  });
  it('flips the sign when dividing by a negative', () => {
    // -2x > 6  →  x < -3
    expect(ans(inequalitySolver, '-2x > 6')).toBe('x < -3');
  });
  it('solves a quadratic inequality between the roots', () => {
    expect(ans(inequalitySolver, 'x^2 - 5x + 6 < 0')).toBe('2 < x < 3');
  });
  it('solves a quadratic inequality outside the roots', () => {
    expect(ans(inequalitySolver, 'x^2 - 5x + 6 > 0')).toBe('x < 2 \\;\\text{or}\\; x > 3');
  });
  it('handles an inequality that is always true', () => {
    const r = inequalitySolver.solve('x^2 + 1 > 0', 'auto');
    expect(r.ok).toBe(true);
  });
  it('does not claim matrix or vector input', () => {
    expect(inequalitySolver.detect('[[1,2],[3,4]]')).toBe(0);
  });
});

describe('sketching curves', () => {
  it('finds the key features of a parabola', () => {
    const r = functionsSolver.solve('sketch y = x^2 - 4x + 3', 'features');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const all = r.solution.steps.map((s) => s.latex ?? '').join(' ');
      expect(all).toContain('x = 1'); // roots at 1 and 3
      expect(all).toContain('x = 3');
      expect(all).toContain('f(0) = 3'); // y-intercept
      expect(all).toContain('x = 2'); // axis of symmetry / turning point
    }
  });
  it('classifies a minimum correctly', () => {
    const r = functionsSolver.solve('sketch y = x^2 - 4x + 3', 'features');
    if (r.ok) {
      expect(r.solution.steps.some((s) => s.annotation === 'a minimum')).toBe(true);
    }
  });
  it('finds both turning points of a cubic', () => {
    const r = functionsSolver.solve('sketch y = x^3 - 3x', 'features');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.solution.steps.some((s) => s.annotation === 'a maximum')).toBe(true);
      expect(r.solution.steps.some((s) => s.annotation === 'a minimum')).toBe(true);
    }
  });
});

describe('probability', () => {
  it('finds a single-event probability and its complement', () => {
    const r = probabilitySolver.solve('3 out of 8', 'single');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.solution.answerLatex).toBe('\\frac{3}{8}');
      expect(r.solution.steps.some((s) => s.annotation === 'complement')).toBe(true);
    }
  });
  it('rejects more favourable outcomes than total', () => {
    expect(probabilitySolver.solve('9 out of 8', 'single').ok).toBe(false);
  });
  it('applies the addition rule', () => {
    // P(A)=0.5, P(B)=0.4 independent → 0.5+0.4−0.2 = 0.7
    const r = probabilitySolver.solve('P(A)=0.5, P(B)=0.4 union', 'union');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution.answerLatex).toBe('\\frac{7}{10}');
  });
  it('applies conditional probability', () => {
    const r = probabilitySolver.solve('P(A)=0.5, P(B)=0.4 given', 'conditional');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution.answerLatex).toBe('\\frac{1}{2}');
  });
});

describe('counting', () => {
  it('computes a combination', () => {
    expect(ans(countingSolver, '10C3')).toBe('120');
  });
  it('computes a permutation', () => {
    expect(ans(countingSolver, '10P3')).toBe('720');
  });
  it('computes a factorial', () => {
    expect(ans(countingSolver, '5!')).toBe('120');
  });
  it('reads a worded selection', () => {
    expect(ans(countingSolver, 'choose 3 from 10')).toBe('120');
  });
  it('refuses to choose more than there are', () => {
    expect(countingSolver.solve('3C10', 'combination').ok).toBe(false);
  });
});

describe('networks', () => {
  const graph = 'A-B 5, B-C 3, A-C 9, C-D 2';
  it('finds a shortest path', () => {
    // A→B→C→D = 5+3+2 = 10, beating A→C→D = 11
    const r = networksSolver.solve(`${graph} shortest path A to D`, 'shortest-path');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution.answerLatex).toContain('10');
  });
  it('finds a minimum spanning tree', () => {
    // edges 2 + 3 + 5 = 10 connects all four nodes
    const r = networksSolver.solve(`${graph} minimum spanning tree`, 'mst');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution.answerLatex).toContain('10');
  });
  it('reports an unreachable destination', () => {
    expect(networksSolver.solve('A-B 5, C-D 2 shortest path A to D', 'shortest-path').ok).toBe(false);
  });
});

describe('growth, decay & rates', () => {
  it('uses a half-life to find the remaining amount', () => {
    // Carbon-14: after one half-life exactly half remains
    const r = ratesSolver.solve('half-life 5730, initial 100, t=5730', 'half-life');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution.answerLatex).toBe('y = 50');
  });
  it('uses a doubling time', () => {
    const r = ratesSolver.solve('doubling time 10, initial 500, t=20', 'half-life');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution.answerLatex).toBe('y = 2000');
  });
  it('solves for the time to reach a target', () => {
    // half-life 10, from 100 down to 25 → two half-lives → t = 20
    const r = ratesSolver.solve('half-life 10, initial 100, target=25', 'half-life');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution.answerLatex).toBe('t = 20');
  });
  it('asks for a rate when none is given', () => {
    expect(ratesSolver.solve('exponential growth', 'exponential').ok).toBe(false);
  });
});
