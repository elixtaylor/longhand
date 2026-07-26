import { simplifySqrt, isPerfectSquare } from './surd';

describe('simplifySqrt', () => {
  it('extracts the largest square factor', () => {
    expect(simplifySqrt(48)).toEqual({ outside: 4, inside: 3 });
    expect(simplifySqrt(12)).toEqual({ outside: 2, inside: 3 });
    expect(simplifySqrt(72)).toEqual({ outside: 6, inside: 2 });
  });

  it('leaves square-free radicands alone', () => {
    expect(simplifySqrt(7)).toEqual({ outside: 1, inside: 7 });
  });

  it('resolves perfect squares to inside = 1', () => {
    expect(simplifySqrt(49)).toEqual({ outside: 7, inside: 1 });
    expect(simplifySqrt(0)).toEqual({ outside: 0, inside: 1 });
  });

  it('detects perfect squares', () => {
    expect(isPerfectSquare(25)).toBe(true);
    expect(isPerfectSquare(26)).toBe(false);
    expect(isPerfectSquare(0)).toBe(true);
  });
});
