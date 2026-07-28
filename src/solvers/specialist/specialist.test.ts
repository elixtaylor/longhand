import { complexSolver } from './complex';
import { vectorsSolver } from './vectors';
import { matricesSolver } from './matrices';
import { inductionSolver } from './induction';

const sol = (s: { solve: (i: string, m: string) => any }, input: string, method: string) => {
  const r = s.solve(input, method);
  expect(r.ok, `failed to solve "${input}": ${r.ok ? '' : r.error}`).toBe(true);
  return r.ok ? r.solution : null!;
};

describe('complexSolver', () => {
  it('multiplies two complex numbers', () => {
    // (3+4i)(1−2i) = 3 − 6i + 4i − 8i² = 11 − 2i
    expect(sol(complexSolver, '(3+4i)*(1-2i)', 'rectangular').answerLatex).toBe('11 - 2i');
  });
  it('adds and subtracts', () => {
    expect(sol(complexSolver, '(3+4i)+(1-2i)', 'rectangular').answerLatex).toBe('4 + 2i');
    expect(sol(complexSolver, '(3+4i)-(1-2i)', 'rectangular').answerLatex).toBe('2 + 6i');
  });
  it('divides using the conjugate', () => {
    // (3+4i)/(1-2i) = (3+4i)(1+2i)/5 = (3+6i+4i-8)/5 = (-5+10i)/5 = -1+2i
    expect(sol(complexSolver, '(3+4i)/(1-2i)', 'rectangular').answerLatex).toBe('-1 + 2i');
  });
  it('finds the modulus', () => {
    expect(sol(complexSolver, '|3+4i|', 'rectangular').answerLatex).toBe('|z| = 5');
  });
  it('finds the conjugate', () => {
    expect(sol(complexSolver, 'conj(3+4i)', 'rectangular').answerLatex).toBe('3 - 4i');
  });
  it('converts to polar form', () => {
    // 3+4i → 5 cis 53.13°
    const s = sol(complexSolver, 'polar 3+4i', 'polar');
    expect(s.answerLatex).toContain('5');
    expect(s.answerLatex).toContain('53.13');
  });
});

describe('vectorsSolver', () => {
  it('adds vectors component-wise', () => {
    expect(sol(vectorsSolver, '(3,4) + (1,2)', 'component').answerLatex).toContain('4,\\, 6');
  });
  it('finds a magnitude', () => {
    expect(sol(vectorsSolver, '|(3,4)|', 'component').answerLatex).toBe('|\\mathbf{a}| = 5');
  });
  it('computes a dot product', () => {
    // (1,2,3)·(4,5,6) = 4 + 10 + 18 = 32
    expect(sol(vectorsSolver, '(1,2,3) . (4,5,6)', 'component').answerLatex).toContain('32');
  });
  it('computes a cross product', () => {
    // (1,0,0) × (0,1,0) = (0,0,1)
    expect(sol(vectorsSolver, '(1,0,0) x (0,1,0)', 'component').answerLatex).toContain('0,\\, 0,\\, 1');
  });
  it('finds the angle between perpendicular vectors', () => {
    expect(sol(vectorsSolver, 'angle (1,0) (0,1)', 'component').answerLatex).toContain('90');
  });
  it('scales a vector', () => {
    expect(sol(vectorsSolver, '3(2,5)', 'component').answerLatex).toContain('6,\\, 15');
  });
  it('refuses a cross product in two dimensions', () => {
    expect(vectorsSolver.solve('(1,2) x (3,4)', 'component').ok).toBe(false);
  });
});

describe('vectorsSolver — collinearity', () => {
  it('confirms three collinear points in 2D', () => {
    // (0,0), (1,2), (2,4) all lie on y = 2x
    const s = sol(vectorsSolver, 'collinear (0,0) (1,2) (2,4)', 'collinear');
    expect(s.answerLatex).toContain('collinear');
    expect(s.answerLatex).not.toContain('not collinear');
  });
  it('rejects three non-collinear points in 2D', () => {
    const s = sol(vectorsSolver, 'collinear (0,0) (1,2) (2,5)', 'collinear');
    expect(s.answerLatex).toContain('not collinear');
  });
  it('confirms three collinear points in 3D', () => {
    // (2,4,6) and (4,8,12) are both scalar multiples of (1,2,3)
    const s = sol(vectorsSolver, 'collinear (1,2,3) (2,4,6) (4,8,12)', 'collinear');
    expect(s.answerLatex).toContain('collinear');
    expect(s.answerLatex).not.toContain('not collinear');
  });
  it('rejects three non-collinear points in 3D', () => {
    const s = sol(vectorsSolver, 'collinear (1,2,3) (2,4,6) (4,8,13)', 'collinear');
    expect(s.answerLatex).toContain('not collinear');
  });
  it('is collinear when C coincides with A (degenerate but valid)', () => {
    const s = sol(vectorsSolver, 'collinear (1,1) (3,5) (1,1)', 'collinear');
    expect(s.answerLatex).toContain('collinear');
    expect(s.answerLatex).not.toContain('not collinear');
  });
  it('errors when A and B coincide — no direction to test against', () => {
    const r = vectorsSolver.solve('collinear (1,1) (1,1) (2,2)', 'collinear');
    expect(r.ok).toBe(false);
  });
});

describe('vectorsSolver — ratio of division', () => {
  it('finds the midpoint for a 1:1 ratio', () => {
    const s = sol(vectorsSolver, 'ratio (0,0) (4,6) 1:1', 'ratio');
    expect(s.answerLatex).toContain('2');
    expect(s.answerLatex).toContain('3');
  });
  it('divides a segment in a 2:3 ratio', () => {
    // P = (3·A + 2·B)/5 = (3·(0,0) + 2·(5,10))/5 = (2,4)
    const s = sol(vectorsSolver, 'ratio (0,0) (5,10) 2:3', 'ratio');
    expect(s.answerLatex).toContain('2,\\, 4');
  });
  it('works in three dimensions', () => {
    // P = (4·A + 1·B)/5 = (4·(0,0,0) + (10,10,10))/5 = (2,2,2)
    const s = sol(vectorsSolver, 'ratio (0,0,0) (10,10,10) 1:4', 'ratio');
    expect(s.answerLatex).toContain('2,\\, 2,\\, 2');
  });
  it('rejects a zero ratio part', () => {
    expect(vectorsSolver.solve('ratio (0,0) (4,6) 0:1', 'ratio').ok).toBe(false);
  });
});

describe('matricesSolver', () => {
  it('multiplies two 2×2 matrices', () => {
    // [[1,2],[3,4]]·[[5,6],[7,8]] = [[19,22],[43,50]]
    const a = sol(matricesSolver, '[[1,2],[3,4]] * [[5,6],[7,8]]', 'standard').answerLatex!;
    expect(a).toContain('19 & 22');
    expect(a).toContain('43 & 50');
  });
  it('adds matrices', () => {
    expect(sol(matricesSolver, '[[1,2],[3,4]] + [[5,6],[7,8]]', 'standard').answerLatex).toContain('6 & 8');
  });
  it('finds a determinant', () => {
    // 1·4 − 2·3 = −2
    expect(sol(matricesSolver, 'det [[1,2],[3,4]]', 'standard').answerLatex).toBe('\\det = -2');
  });
  it('finds a 3×3 determinant', () => {
    expect(sol(matricesSolver, 'det [[6,1,1],[4,-2,5],[2,8,7]]', 'standard').answerLatex).toBe('\\det = -306');
  });
  it('finds an inverse', () => {
    // [[1,2],[3,4]]⁻¹ = [[-2,1],[1.5,-0.5]]
    const a = sol(matricesSolver, 'inverse [[1,2],[3,4]]', 'standard').answerLatex!;
    expect(a).toContain('-2 & 1');
  });
  it('reports a singular matrix honestly', () => {
    const s = sol(matricesSolver, 'inverse [[1,2],[2,4]]', 'standard');
    expect(s.answerLatex).toBeUndefined();
    expect(JSON.stringify(s.steps)).toContain('No inverse');
  });
  it('rejects mismatched multiplication', () => {
    expect(matricesSolver.solve('[[1,2],[3,4]] * [[1,2,3]]', 'standard').ok).toBe(false);
  });
});

describe('inductionSolver', () => {
  it('derives and proves the sum of the first n integers', () => {
    const s = sol(inductionSolver, 'sum r', 'sum');
    // n(n+1)/2
    expect(s.answerLatex).toContain('\\dfrac{');
    expect(s.answerLatex).toContain('(n + 1)');
    expect(s.answerLatex).toContain('}{2}');
  });

  it('derives the sum of squares', () => {
    // n(n+1)(2n+1)/6
    const s = sol(inductionSolver, 'sum r^2', 'sum');
    expect(s.answerLatex).toContain('}{6}');
    expect(s.answerLatex).toContain('(2n + 1)');
  });

  it('derives the sum of odd numbers as n²', () => {
    // 1+3+5+…+(2n−1) = n²
    const s = sol(inductionSolver, 'sum 2r-1', 'sum');
    expect(s.answerLatex).toContain('n');
    // no denominator needed for n²
    expect(s.answerLatex).not.toContain('\\dfrac');
  });

  it('lays out all three parts of the proof', () => {
    const s = sol(inductionSolver, 'sum r', 'sum');
    const text = s.steps.map((x: { note?: string }) => x.note ?? '').join(' ');
    expect(text).toContain('base case');
    expect(text).toContain('inductive assumption');
    expect(text).toContain('inductive step');
  });
});
