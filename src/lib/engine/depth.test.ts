import { solvers } from './registry';
import { runWorked } from './run';
import { examples } from '../../data/examples';

/**
 * The working is the product. A line a student cannot get to from the line
 * above is a gap in it, so these check the shape of every solution the app
 * can produce rather than any one answer.
 */

const worked = (raw: string) => {
  const w = runWorked(raw);
  const part = w.parts[0];
  if (!part?.result.ok) throw new Error(`"${raw}" did not solve`);
  return part.result.solution;
};
const lines = (raw: string) => worked(raw).steps.map((s) => s.latex ?? '');

describe('every step carries something', () => {
  it('never shows a step with neither maths nor a diagram', () => {
    for (const ex of examples) {
      const w = runWorked(ex.input);
      for (const part of w.parts) {
        if (!part.result.ok) continue;
        part.result.solution.steps.forEach((s, i) => {
          expect(
            !!(s.latex || s.visual),
            `"${ex.label}" step ${i + 1} has a note but nothing to show: ${s.note}`,
          ).toBe(true);
        });
      }
    }
  });

  it('never repeats the previous line verbatim', () => {
    for (const ex of examples) {
      const w = runWorked(ex.input);
      for (const part of w.parts) {
        if (!part.result.ok) continue;
        const ls = part.result.solution.steps.map((s) => s.latex).filter(Boolean);
        for (let i = 1; i < ls.length; i++) {
          expect(ls[i], `"${ex.label}" repeats a line at step ${i + 1}`).not.toBe(ls[i - 1]);
        }
      }
    }
  });

  it('explains what it is doing on every step', () => {
    for (const solver of solvers) {
      for (const ex of examples.filter((e) => e.solverId === solver.id)) {
        const r = solver.solve(ex.input, ex.methodId ?? solver.defaultMethodId);
        if (!r.ok) continue;
        for (const [i, s] of r.solution.steps.entries()) {
          expect(s.note, `${solver.id} step ${i + 1} has no explanation`).toBeTruthy();
        }
      }
    }
  });
});

describe('the moves that used to be skipped', () => {
  it('writes a balancing operation on both sides before its result', () => {
    const ls = lines('3x + 4 = 2x - 5');
    // The line showing the same thing done to both sides, then the tidy-up.
    expect(ls).toContain('3x + 4 - 2x = 2x - 5 - 2x');
    expect(ls).toContain('x + 4 = -5');
    expect(ls).toContain('x + 4 - 4 = -5 - 4');
  });

  it('shows the subtraction of one equation from the other', () => {
    const ls = lines('2x + 3y = 12 ; x - y = 1');
    expect(ls.join(' | ')).toContain('\\left(2x + 3y\\right) - \\left(2x - 2y\\right)');
    // …and the back-substitution one stage at a time, not in a single arrow.
    expect(ls).toContain('2x + 3\\left(2\\right) = 12');
    expect(ls).toContain('2x + 6 = 12');
    expect(ls).toContain('2x = 6');
  });

  it('squares the half-coefficient on its own line', () => {
    const ls = lines('x^2 + 6x + 2 = 0');
    expect(ls).toContain('x^{2} + 6x + 9 = -2 + 9');
    expect(ls).toContain('x^{2} + 6x + 9 = 7');
    expect(ls).toContain('\\left(x + 3\\right)^{2} = 7');
  });

  it('breaks the cosine rule into its arithmetic', () => {
    const ls = lines('a = 7, b = 9, C = 40').join(' | ');
    expect(ls).toContain('126'); // 2ab worked out
    expect(ls).toContain('\\cos 40^{\\circ} = 0.766044'); // enough figures to reuse
    expect(ls).toContain('c^{2} = 33.4784');
    expect(ls).toContain('c = \\sqrt{33.4784} = 5.7861'); // before rounding
  });

  it('evaluates the compound-interest power separately', () => {
    const ls = lines('$5000 at 4% for 3 years compound').join(' | ');
    // 1.04³ = 1.124864, and 5000 × that is the balance.
    expect(ls).toContain('1.124864');
  });
});

describe('the arithmetic on a step reproduces on a calculator', () => {
  /**
   * A step that prints "126 × 0.766 = 96.5216" is worse than no step: a
   * student checking it gets 96.516 and concludes they were wrong. Any
   * "p × q = r" written into a step has to actually hold at the precision
   * shown.
   */
  it('never prints a product that does not hold to the figures given', () => {
    const inputs = [
      'a = 7, b = 9, C = 40',
      'a = 6, b = 8, C = 50 area',
      '$5000 at 4% for 3 years compound',
      '$20000 at 15% for 4 years depreciation',
      '2x + 3y = 12 ; x - y = 1',
    ];
    for (const raw of inputs) {
      for (const step of worked(raw).steps) {
        // Products can be chains — "2 × 7 × 9 = 126" — so take every factor.
        for (const m of (step.note ?? '').matchAll(
          /(-?[\d.]+(?:\s*\\times\s*-?[\d.]+)+)\s*=\s*(-?[\d.]+)/g,
        )) {
          const factors = m[1].split(/\s*\\times\s*/).map(Number);
          const stated = Number(m[2]);
          const actual = factors.reduce((a, b) => a * b, 1);
          const dp = (m[2].split('.')[1] ?? '').length;
          const tolerance = Math.pow(10, -dp) / 2 + Math.abs(actual) * 1e-6;
          expect(
            Math.abs(actual - stated) <= tolerance,
            `"${raw}": step says ${factors.join(' × ')} = ${stated}, but it is ${actual}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('undoing an operation is shown, not assumed', () => {
  /**
   * The move a student is most likely to be marked down for leaving out is
   * the one that justifies the next line. "ln x = 5, therefore x = e^5" skips
   * the step that makes it true.
   */
  it('raises both sides as a power before cancelling the logarithm', () => {
    const ls = lines('ln x = 5');
    expect(ls).toContain('e^{\\,\\ln x} = e^{\\,5}'); // the same-to-both-sides move
    expect(ls).toContain('x = e^{\\,5}'); // only then does the log cancel
    expect(ls).toContain('x = 148.413159');
  });

  it('does the same for a base-10 logarithm', () => {
    const ls = lines('log x = 3');
    expect(ls).toContain('10^{\\,\\log x} = 10^{\\,3}');
    expect(ls).toContain('x = 1000');
  });

  it('looks up each logarithm before dividing them', () => {
    const ls = lines('3^x = 20').join(' | ');
    expect(ls).toContain('2.995732'); // ln 20
    expect(ls).toContain('1.098612'); // ln 3
  });

  it('squares, adds and roots on separate lines in Pythagoras', () => {
    const ls = lines('a=3, b=4');
    expect(ls).toContain('c^{2} = 3^{2} + 4^{2}');
    expect(ls).toContain('c^{2} = 9 + 16');
    expect(ls).toContain('c^{2} = 25');
  });

  it('looks up a trigonometric ratio before multiplying by it', () => {
    const ls = lines('A=30, c=10').join(' | ');
    expect(ls).toContain('\\sin 30^{\\circ} = 0.5');
  });
});
