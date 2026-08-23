import { describe, expect, it } from 'vitest';
import { circleGeometrySolver } from './circles';

function solution(input: string, method: string) {
  const result = circleGeometrySolver.solve(input, method);
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
  return result.ok ? result.solution : null!;
}

describe('circleGeometrySolver', () => {
  it('detects its canonical calculator inputs on the main solver', () => {
    expect(circleGeometrySolver.detect('measure r=5')).toBe(0.96);
    expect(circleGeometrySolver.detect('theorem circumference=34')).toBe(0.96);
  });

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

  it('matches angles standing on the same chord', () => {
    const result = solution('same-segment angle1=42', 'same-segment');
    expect(result.derivedValues?.angle2).toBe(42);
  });

  it('finds the right angle in a semicircle', () => {
    const result = solution('semicircle diameter=10', 'semicircle');
    expect(result.derivedValues?.angle).toBe(90);
  });

  it('uses the radius and tangent theorem', () => {
    const result = solution('tangent-radius radius=5', 'tangent-radius');
    expect(result.derivedValues?.angle).toBe(90);
  });

  it('matches the two tangents from an external point', () => {
    const result = solution('equal-tangents tangent1=12', 'equal-tangents');
    expect(result.derivedValues?.tangent2).toBe(12);
  });

  it('matches equal chords and central angles', () => {
    const result = solution('equal-chords chord1=8', 'equal-chords');
    expect(result.derivedValues?.chord2).toBe(8);
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

  it('solves an intersecting-chords product', () => {
    const result = solution(
      'intersecting-chords segment1=3 segment2=8 segment3=4',
      'intersecting-chords',
    );
    expect(result.derivedValues?.segment4).toBe(6);
  });

  it('solves the tangent-secant power relation', () => {
    const result = solution(
      'power-of-point tangent=12 external=9',
      'power-of-point',
    );
    expect(result.derivedValues?.whole).toBe(16);
  });

  it('rejects an impossible chord', () => {
    const result = circleGeometrySolver.solve(
      'chord-distance r=5 c=11',
      'chord-distance',
    );
    expect(result.ok).toBe(false);
  });

  it('rejects inconsistent complete circle measurements', () => {
    expect(
      circleGeometrySolver.solve(
        'power-of-point tangent=12 external=9 whole=20',
        'power-of-point',
      ).ok,
    ).toBe(false);
    expect(
      circleGeometrySolver.solve(
        'chord-distance r=5 c=6 distance=3',
        'chord-distance',
      ).ok,
    ).toBe(false);
    expect(
      circleGeometrySolver.solve(
        'tangent-length r=5 distance=13 tangent=10',
        'tangent-length',
      ).ok,
    ).toBe(false);
  });

  it('rejects non-finite circle lengths', () => {
    expect(
      circleGeometrySolver.solve('measure r=1e309', 'measurements').ok,
    ).toBe(false);
  });

  it('rejects finite inputs whose derived circle values overflow', () => {
    expect(
      circleGeometrySolver.solve('measure r=1e200', 'measurements').ok,
    ).toBe(false);
    expect(
      circleGeometrySolver.solve(
        'power-of-point tangent=1e308 external=1',
        'power-of-point',
      ).ok,
    ).toBe(false);
    expect(
      circleGeometrySolver.solve(
        'chord-distance c=2 distance=1e308',
        'chord-distance',
      ).ok,
    ).toBe(false);
  });
});
