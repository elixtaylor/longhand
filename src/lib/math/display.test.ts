import { describe, expect, it } from 'vitest';
import { decimaliseLatex } from './display';

describe('display formatting', () => {
  it('converts simple exact fractions and radicals', () => {
    expect(decimaliseLatex('\\dfrac{1}{2} + \\sqrt{9}')).toBe('0.5 + 3');
  });
});
