import { rightTriangleSolver } from './right-triangle';
import { triangleRulesSolver } from './triangle-rules';
import { trigEquationSolver } from './trig-equations';
import { measurementSolver } from '../measurement';

const ans = (s: { solve: (i: string, m: string) => any }, input: string, method: string) => {
  const r = s.solve(input, method);
  return r.ok ? r.solution.answerLatex : undefined;
};

describe('rightTriangleSolver', () => {
  it('finds the hypotenuse with Pythagoras (3-4-5)', () => {
    expect(ans(rightTriangleSolver, 'a=3, b=4', 'pythagoras')).toBe('c = 5');
  });
  it('finds a short side with Pythagoras (5-12-13)', () => {
    expect(ans(rightTriangleSolver, 'a=5, c=13', 'pythagoras')).toBe('b = 12');
  });
  it('rejects a hypotenuse that is not the longest side', () => {
    expect(rightTriangleSolver.solve('a=13, c=5', 'pythagoras').ok).toBe(false);
  });
  it('finds a side from an angle and the hypotenuse', () => {
    // a = 10 sin 30° = 5
    expect(ans(rightTriangleSolver, 'A=30, c=10', 'trig-ratio')).toBe('a = 5');
  });
  it('finds an angle from two sides', () => {
    // tan A = 3/4 → 36.87°
    expect(ans(rightTriangleSolver, 'a=3, b=4', 'trig-ratio')).toBe('A = 36.87^{\\circ}');
  });
});

describe('triangleRulesSolver', () => {
  it('finds the third side with the cosine rule', () => {
    // c² = 49 + 81 − 2·7·9·cos40° = 33.47… → c ≈ 5.79
    const a = ans(triangleRulesSolver, 'a=7, b=9, C=40', 'cosine-rule');
    expect(a).toBe('c = 5.79');
  });
  it('finds an angle from three sides (3-4-5 is right-angled)', () => {
    expect(ans(triangleRulesSolver, 'a=3, b=4, c=5', 'cosine-rule')).toBe('C = 90^{\\circ}');
  });
  it('rejects three lengths that cannot form a triangle', () => {
    expect(triangleRulesSolver.solve('a=1, b=2, c=10', 'cosine-rule').ok).toBe(false);
  });
  it('finds a side with the sine rule', () => {
    // a/sinA = b/sinB → b = 10·sin30/sin90 = 5
    expect(ans(triangleRulesSolver, 'a=10, A=90, B=30', 'sine-rule')).toBe('b = 5');
  });
  it('finds area from two sides and the included angle', () => {
    // ½·6·8·sin90 = 24
    expect(ans(triangleRulesSolver, 'a=6, b=8, C=90', 'area')).toBe('\\text{Area} = 24');
  });
  it('finds area from three sides with Heron', () => {
    // 3-4-5 right triangle → area 6
    expect(ans(triangleRulesSolver, 'a=3, b=4, c=5', 'area')).toBe('\\text{Area} = 6');
  });
});

describe('trigEquationSolver', () => {
  it('solves sin x = 0.5', () => {
    expect(ans(trigEquationSolver, 'sin x = 0.5', 'unit-circle')).toBe('x = 30^{\\circ},\\; x = 150^{\\circ}');
  });
  it('solves cos x = 0.5', () => {
    expect(ans(trigEquationSolver, 'cos x = 0.5', 'unit-circle')).toBe('x = 60^{\\circ},\\; x = 300^{\\circ}');
  });
  it('solves tan x = 1', () => {
    expect(ans(trigEquationSolver, 'tan x = 1', 'unit-circle')).toBe('x = 45^{\\circ},\\; x = 225^{\\circ}');
  });
  it('rejects an impossible sine value', () => {
    expect(trigEquationSolver.solve('sin x = 2', 'unit-circle').ok).toBe(false);
  });
});

describe('measurementSolver', () => {
  it('finds the area and circumference of a circle', () => {
    const r = measurementSolver.solve('circle r=5', 'auto');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.solution.answerLatex).toContain('78.54'); // π·25
      expect(r.solution.answerLatex).toContain('31.42'); // 2π·5
    }
  });
  it('finds the volume of a cylinder', () => {
    const r = measurementSolver.solve('cylinder r=3, h=10 volume', 'auto');
    expect(r.ok && r.solution.answerLatex).toContain('282.74'); // π·9·10
  });
  it('finds the volume of a sphere', () => {
    expect(ans(measurementSolver, 'sphere r=3 volume', 'volume')).toContain('113.1'); // 4/3π·27
  });
  it('finds the area of a trapezium', () => {
    // ½(5+7)·4 = 24
    expect(ans(measurementSolver, 'trapezium a=5, b=7, h=4', 'area')).toContain('24');
  });
  it('asks for the missing measurement', () => {
    const r = measurementSolver.solve('cylinder r=3', 'auto');
    expect(r.ok).toBe(false);
  });
});
