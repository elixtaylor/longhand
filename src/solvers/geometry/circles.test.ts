import { describe, expect, it } from 'vitest';
import { circleGeometrySolver } from './circles';

function solution(input: string, method: string) {
  const result = circleGeometrySolver.solve(input, method);
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
  return result.ok ? result.solution : null!;
}

describe('circleGeometrySolver', () => {
  it('finds area and circumference from a radius and fills diameter', () => {
    const result = solution('measure r=5', 'measurements');
    expect(result.answerLatex).toContain('C = 31.42');
    expect(result.answerLatex).toContain('A = 78.54');
    expect(result.derivedValues?.d).toBe(10);
  });

  it('finds arc length and sector area', () => {
    const result = solution('arc r=6 theta=60', 'arc-sector');
    expect(result.answerLatex).toContain('L = 6.28');
    expect(result.answerLatex).toContain('A_{sector} = 18.85');
  });

  it('finds chord, centre distance and minor segment area', () => {
    const result = solution('chord r=10 theta=60', 'chord');
    expect(result.answerLatex).toContain('c = 10');
    expect(result.answerLatex).toContain('d = 8.66');
    expect(result.answerLatex).toContain('A_{segment}');
  });

  it('uses the angle at the centre theorem in either direction', () => {
    const result = solution('theorem circumference=34', 'centre-angle');
    expect(result.derivedValues?.centre).toBe(68);
    expect(result.answerLatex).toContain('68');
  });

  it('finds an opposite cyclic angle', () => {
    const result = solution('cyclic a=112', 'cyclic');
    expect(result.derivedValues?.b).toBe(68);
  });

  it('matches tangent-chord and alternate-segment angles', () => {
    const result = solution('tangent-chord alternate=47', 'tangent-chord');
    expect(result.derivedValues?.tangent).toBe(47);
  });

  it('finds a chord distance from radius and chord', () => {
    const result = solution('chord-distance r=5 c=6', 'chord-distance');
    expect(result.derivedValues?.distance).toBeCloseTo(4, 8);
  });

  it('finds a tangent length from the radius and centre distance', () => {
    const result = solution('tangent-length r=5 distance=13', 'tangent-length');
    expect(result.derivedValues?.tangent).toBe(12);
  });

  it('rejects an impossible chord', () => {
    const result = circleGeometrySolver.solve(
      'chord-distance r=5 c=11',
      'chord-distance',
    );
    expect(result.ok).toBe(false);
  });
});
