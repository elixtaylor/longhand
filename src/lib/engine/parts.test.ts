import { runWorked } from './run';
import { plainAnswer, subjectOf } from './parts';
import { getSolver } from './registry';

/**
 * School questions do not respect topic boundaries. These check that a
 * question spanning two topics is worked as two parts — and, just as
 * importantly, that a question which merely *contains* the word "and" is not
 * torn in half.
 */

const ids = (raw: string) => runWorked(raw).parts.map((p) => p.solver.id);
const answers = (raw: string) =>
  runWorked(raw).parts.map((p) => (p.result.ok ? p.result.solution.answerLatex : `FAILED`));

describe('questions that span two topics', () => {
  it('splits on an explicit "then"', () => {
    expect(ids('x^2 - 4 = 0 then d/dx x^2 - 4')).toEqual(['quadratics', 'differentiate']);
  });

  it('splits on a semicolon', () => {
    expect(ids('234 × 56 ; 864 ÷ 24')).toEqual(['multiplication', 'division']);
    expect(answers('234 × 56 ; 864 ÷ 24')).toEqual(['13104', '36']);
  });

  it('splits on "and" when both halves stand alone', () => {
    expect(ids('differentiate x^2 sin x and integrate 3x^2')).toEqual([
      'differentiate',
      'integrate',
    ]);
  });

  it('works three parts in a row', () => {
    const got = ids('234 × 56 then 864 ÷ 24 then 3/4 + 1/6');
    expect(got).toEqual(['multiplication', 'division', 'fractions']);
  });

  it('labels the parts a, b, c', () => {
    expect(runWorked('234 × 56 then 864 ÷ 24').parts.map((p) => p.label)).toEqual(['a', 'b']);
  });
});

describe('questions that only look like two topics', () => {
  /**
   * The guard that matters most. "Sides 5, 6" does not solve on its own, so
   * the split is rejected and the triangle stays whole.
   */
  it('does not split a triangle at "and"', () => {
    const w = runWorked('find the area of a triangle with sides 5, 6 and 7');
    expect(w.split).toBe(false);
    expect(w.parts).toHaveLength(1);
    expect(w.parts[0].solver.id).toBe('triangle-rules');
  });

  it('does not split a list of data at "and"', () => {
    const w = runWorked('mean and median of 4, 8, 15, 16, 23, 42');
    expect(w.parts).toHaveLength(1);
  });

  it('leaves ordinary one-topic questions alone', () => {
    for (const q of ['3/4 + 1/6', 'a = 7, b = 9, C = 40', '2x^2 + 7x - 4 = 0', 'sin x = 0.5']) {
      const w = runWorked(q);
      expect(w.split, `"${q}" should stay whole`).toBe(false);
      expect(w.parts[0].result.ok, `"${q}" should solve`).toBe(true);
    }
  });

  it('respects a topic the student chose by hand', () => {
    const solver = getSolver('differentiate')!;
    const w = runWorked('d/dx x^3 - 4x^2', { solver, methodId: 'power' });
    expect(w.split).toBe(false);
    expect(w.parts[0].solver.id).toBe('differentiate');
  });
});

describe('a later part referring to an earlier one', () => {
  it('uses the earlier answer for "the answer"', () => {
    const w = runWorked('3x + 4 = 2x - 5 and then find 20% of the answer');
    expect(w.parts.map((p) => p.solver.id)).toEqual(['linear', 'percentages']);
    expect(w.parts[0].result.ok && w.parts[0].result.solution.answerLatex).toBe('x = -9');
    // 20% of −9 = −1.8
    expect(w.parts[1].result.ok && w.parts[1].result.solution.answerLatex).toContain('1.8');
  });

  it('uses the earlier expression for "differentiate it"', () => {
    // Not the roots: "differentiate it" means differentiate x² + 5x + 6,
    // and differentiating a root would give a confident answer of 0.
    const w = runWorked('solve x^2 + 5x + 6 = 0 then differentiate it');
    expect(w.parts[1].result.ok && w.parts[1].result.solution.answerLatex).toBe("f'(x) = 2x + 5");
  });

  it('uses the earlier answer for "integrate the answer"', () => {
    // d/dx x³ = 3x², and ∫3x² dx = x³ — back where we started.
    const w = runWorked('differentiate x^3 then integrate the answer');
    expect(w.parts[1].result.ok && w.parts[1].result.solution.answerLatex).toBe('x^{3} + C');
  });

  it('picks the named one out of several roots', () => {
    // Roots are 1/2 and −4; the larger is 1/2, and 15% of that is 0.075.
    const w = runWorked('solve 2x^2 + 7x - 4 = 0 then find 15% of the larger root');
    expect(w.parts[1].result.ok && w.parts[1].result.solution.answerLatex).toContain('0.0');
  });

  it('records what the student actually wrote', () => {
    const w = runWorked('3x + 4 = 2x - 5 and then find 20% of the answer');
    expect(w.parts[1].carried).toContain('the answer');
  });
});

describe('reading an answer back as a value', () => {
  it('takes the value from the right of the last "="', () => {
    expect(plainAnswer('x = -9')).toBe('-9');
    expect(plainAnswer("f'(x) = 3x^{2}")).toBe('3x^2');
  });

  it('refuses an answer that is not a single value', () => {
    // Choosing one of two roots at random would be a wrong answer that looks
    // exactly like a right one.
    expect(plainAnswer('x = -2 \\quad\\text{or}\\quad x = -3')).toBeNull();
    expect(plainAnswer('\\bar{x} = 9.2, \\quad \\text{median} = 10')).toBeNull();
    expect(plainAnswer(undefined)).toBeNull();
  });

  it('finds what a question was about, without its command word', () => {
    expect(subjectOf('solve x^2 + 5x + 6 = 0')).toBe('x^2 + 5x + 6');
    expect(subjectOf('differentiate x^3')).toBe('x^3');
  });
});
