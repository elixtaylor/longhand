import { Rational } from './rational';

describe('Rational', () => {
  it('reduces on construction', () => {
    const r = new Rational(4, 8);
    expect(r.n).toBe(1);
    expect(r.d).toBe(2);
  });

  it('normalises sign to the numerator', () => {
    const r = new Rational(1, -2);
    expect(r.n).toBe(-1);
    expect(r.d).toBe(2);
  });

  it('adds and subtracts exactly', () => {
    expect(new Rational(1, 2).add(new Rational(1, 3)).eq(new Rational(5, 6))).toBe(true);
    expect(new Rational(3, 4).sub(new Rational(1, 6)).eq(new Rational(7, 12))).toBe(true);
  });

  it('multiplies and divides exactly', () => {
    expect(new Rational(2, 3).mul(new Rational(3, 4)).eq(new Rational(1, 2))).toBe(true);
    expect(new Rational(1, 2).div(new Rational(3, 4)).eq(new Rational(2, 3))).toBe(true);
  });

  it('parses integers, decimals, fractions and signs', () => {
    expect(Rational.parse('-3').eq(new Rational(-3))).toBe(true);
    expect(Rational.parse('2.5').eq(new Rational(5, 2))).toBe(true);
    expect(Rational.parse('-3/4').eq(new Rational(-3, 4))).toBe(true);
    expect(Rational.parse('0.25').eq(new Rational(1, 4))).toBe(true);
  });

  it('raises to integer powers including negative', () => {
    expect(new Rational(2, 3).pow(2).eq(new Rational(4, 9))).toBe(true);
    expect(new Rational(2).pow(-1).eq(new Rational(1, 2))).toBe(true);
  });

  it('reports predicates correctly', () => {
    expect(new Rational(0, 5).isZero()).toBe(true);
    expect(new Rational(6, 3).isInt()).toBe(true);
    expect(new Rational(-1, 2).isNeg()).toBe(true);
  });
});
