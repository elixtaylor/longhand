import { rl, polyLatex } from './format';
import { Rational } from './rational';
import { parsePoly } from './parse';

describe('rl (rational -> latex)', () => {
  it('formats integers plainly', () => {
    expect(rl(new Rational(3))).toBe('3');
    expect(rl(new Rational(-4))).toBe('-4');
  });
  it('formats fractions with the sign outside', () => {
    expect(rl(new Rational(3, 4))).toBe('\\frac{3}{4}');
    expect(rl(new Rational(-1, 2))).toBe('-\\frac{1}{2}');
  });
});

describe('polyLatex', () => {
  it('renders a quadratic with correct signs and hidden unit coefficients', () => {
    expect(polyLatex(parsePoly('2x^2 + 7x - 4'))).toBe('2x^{2} + 7x - 4');
    expect(polyLatex(parsePoly('x^2 - x'))).toBe('x^{2} - x');
  });
  it('renders a lone constant', () => {
    expect(polyLatex(parsePoly('5'))).toBe('5');
  });
});
