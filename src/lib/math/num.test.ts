import { round, money, fmt, parseParams, formatParams, parseNumberList, nCr } from './num';

describe('round', () => {
  it('rounds half away from zero', () => {
    expect(round(2.345, 2)).toBe(2.35);
    expect(round(-2.345, 2)).toBe(-2.35);
    expect(round(2.344, 2)).toBe(2.34);
  });

  it('recovers exact halves that floating point stores a hair low', () => {
    // 20000 × 0.85⁴ is exactly 10440.125 but is held as 10440.124999999998.
    const depreciated = 20000 * Math.pow(0.85, 4);
    expect(depreciated).toBeLessThan(10440.125); // the float really is low
    expect(round(depreciated, 2)).toBe(10440.13); // …and we still round correctly
  });

  it('does not drag genuinely-below values upward', () => {
    expect(round(10440.1249, 2)).toBe(10440.12);
    expect(round(0.4999, 0)).toBe(0);
  });
});

describe('money', () => {
  it('always shows two decimal places with separators', () => {
    expect(money(5624.3168)).toBe('5,624.32');
    expect(money(1000)).toBe('1,000.00');
    expect(money(20000 * Math.pow(0.85, 4))).toBe('10,440.13');
  });
});

describe('fmt', () => {
  it('keeps integers clean and trims trailing zeros', () => {
    expect(fmt(5)).toBe('5');
    expect(fmt(5.5)).toBe('5.5');
    expect(fmt(5.10)).toBe('5.1');
    expect(fmt(1 / 3, 4)).toBe('0.3333');
  });
});

describe('parseParams', () => {
  it('reads key=value pairs and keeps case', () => {
    expect(parseParams('a=7, b=9, C=40')).toEqual({ a: 7, b: 9, C: 40 });
  });
  it('handles negatives and decimals', () => {
    expect(parseParams('r=-0.5, n=10')).toEqual({ r: -0.5, n: 10 });
  });
});

describe('formatParams', () => {
  it('formats filled fields as key=value pairs, skipping blanks', () => {
    expect(formatParams({ a: [3], b: [], c: [4] })).toBe('a=3, c=4');
  });
  it('keeps negatives and decimals exactly as given', () => {
    expect(formatParams({ A: [30.5], c: [-10] })).toBe('A=30.5, c=-10');
  });
  it('returns an empty string when nothing is filled', () => {
    expect(formatParams({ a: [], b: [] })).toBe('');
  });
});

describe('parseNumberList', () => {
  it('splits on commas and spaces', () => {
    expect(parseNumberList('3, 7, 11, 15')).toEqual([3, 7, 11, 15]);
    expect(parseNumberList('1 2 3')).toEqual([1, 2, 3]);
  });
  it('rejects non-numeric entries', () => {
    expect(() => parseNumberList('1, two, 3')).toThrow();
  });
});

describe('nCr', () => {
  it('computes binomial coefficients', () => {
    expect(nCr(5, 2)).toBe(10);
    expect(nCr(10, 0)).toBe(1);
    expect(nCr(10, 10)).toBe(1);
    expect(nCr(5, 6)).toBe(0);
  });
});
