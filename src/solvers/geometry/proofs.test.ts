import { geometricProofSolver } from './proofs';

describe('geometricProofSolver', () => {
  it('proves the angle sum of a triangle with a parallel line', () => {
    const result = geometricProofSolver.solve(
      'prove the angles in a triangle add to 180',
      'angle-sum',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.solution.answerLatex).toBe('A + B + C = 180^{\\circ}');
      expect(result.solution.steps).toHaveLength(4);
      expect(
        result.solution.steps.some((step) =>
          /alternate angles/i.test(step.note ?? ''),
        ),
      ).toBe(true);
    }
  });

  it('proves alternate and co-interior parallel-line facts', () => {
    const alternate = geometricProofSolver.solve(
      'prove alternate angles are equal when lines are parallel',
      'parallel-lines',
    );
    expect(alternate.ok && alternate.solution.answerLatex).toBe(
      '\\angle 1 = \\angle 2',
    );

    const coInterior = geometricProofSolver.solve(
      'prove co-interior angles on parallel lines sum to 180',
      'parallel-lines',
    );
    expect(coInterior.ok && coInterior.solution.answerLatex).toBe(
      '\\angle 1 + \\angle 2 = 180^{\\circ}',
    );
  });

  it('proves equal base angles in an isosceles triangle', () => {
    const result = geometricProofSolver.solve(
      'prove the base angles of an isosceles triangle are equal',
      'isosceles',
    );
    expect(result.ok && result.solution.answerLatex).toBe(
      '\\angle ABC = \\angle BCA',
    );
  });

  it('proves triangle congruence using a named criterion', () => {
    const result = geometricProofSolver.solve(
      'prove triangles ABC and DEF are congruent by SAS',
      'congruence',
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.solution.methodName).toBe('SAS congruence proof');
  });

  it('does not claim unrelated prose', () => {
    expect(geometricProofSolver.detect('solve 2x + 3 = 9')).toBe(0);
    expect(geometricProofSolver.solve('prove something', 'angle-sum').ok).toBe(
      true,
    );
  });
});
