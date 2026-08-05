import { describe, expect, it } from 'vitest';
import { texToHtml } from '../../components/TeX';
import { redSignedLatex } from './latex';

describe('operation colour markup', () => {
  it('ends after the signed term instead of colouring the rest of the line', () => {
    const operation = redSignedLatex('-', '5');
    const html = texToHtml(`x + 5 ${operation} = e^{5} ${operation}`, true);

    // The equality and the following base must remain ordinary black KaTeX
    // atoms. This specifically guards against the old `\\color` leakage.
    expect(html).toContain('<span class="mrel">=</span>');
    expect(html).toContain('<span class="mord mathnormal">e</span>');
    expect(html).not.toContain('<span class="mrel" style="color:red;">=');
    expect(html).not.toContain(
      '<span class="mord mathnormal" style="color:red;">e',
    );
  });
});
