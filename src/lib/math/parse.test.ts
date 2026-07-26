import { parsePoly, parseEquation, toStandardForm, ParseError } from './parse';
import { Rational } from './rational';

describe('parsePoly', () => {
  it('reads a standard quadratic', () => {
    const p = parsePoly('2x^2 + 7x - 4');
    expect(p.get(2).eq(new Rational(2))).toBe(true);
    expect(p.get(1).eq(new Rational(7))).toBe(true);
    expect(p.get(0).eq(new Rational(-4))).toBe(true);
    expect(p.degree()).toBe(2);
  });

  it('handles implicit and unit coefficients', () => {
    const p = parsePoly('x^2 - x + 1');
    expect(p.get(2).eq(new Rational(1))).toBe(true);
    expect(p.get(1).eq(new Rational(-1))).toBe(true);
    expect(p.get(0).eq(new Rational(1))).toBe(true);
  });

  it('accepts unicode superscripts and minus signs', () => {
    const p = parsePoly('x² − 5x + 6');
    expect(p.get(2).eq(new Rational(1))).toBe(true);
    expect(p.get(1).eq(new Rational(-5))).toBe(true);
    expect(p.get(0).eq(new Rational(6))).toBe(true);
  });

  it('collects like terms', () => {
    const p = parsePoly('3x + 2x - 5');
    expect(p.get(1).eq(new Rational(5))).toBe(true);
    expect(p.get(0).eq(new Rational(-5))).toBe(true);
  });

  it('accepts decimal coefficients exactly', () => {
    const p = parsePoly('0.5x^2 - 1.5');
    expect(p.get(2).eq(new Rational(1, 2))).toBe(true);
    expect(p.get(0).eq(new Rational(-3, 2))).toBe(true);
  });

  it('rejects negative exponents with a clear error', () => {
    expect(() => parsePoly('x^-2')).toThrow(ParseError);
  });
});

describe('parseEquation / toStandardForm', () => {
  it('moves the right-hand side across', () => {
    const eq = parseEquation('x^2 = 5x - 6');
    const std = toStandardForm(eq);
    expect(std.get(2).eq(new Rational(1))).toBe(true);
    expect(std.get(1).eq(new Rational(-5))).toBe(true);
    expect(std.get(0).eq(new Rational(6))).toBe(true);
  });

  it('defaults the right-hand side to zero', () => {
    const eq = parseEquation('2x + 4');
    const std = toStandardForm(eq);
    expect(std.get(1).eq(new Rational(2))).toBe(true);
    expect(std.get(0).eq(new Rational(4))).toBe(true);
  });
});
