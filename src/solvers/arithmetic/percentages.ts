import { fmt } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Percentages — percentage of an amount, percentage change, expressing one
 * number as a percentage of another, and reverse (original-value) problems.
 *
 * The natural-language layer strips the filler word "of", so every pattern
 * here treats it as optional.
 */
const OF = '(?:\\s*of)?\\s*';
const N = '(-?\\d+(?:\\.\\d+)?)';

interface Parsed {
  kind: 'of' | 'increase' | 'decrease' | 'express' | 'reverse-increase' | 'reverse-decrease';
  a: number;
  b: number;
}

function parse(input: string): Parsed {
  const s = input.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  // "after a 10% increase the price is 88" → find the original
  let m = s.match(new RegExp(`${N}\\s*%\\s*(increase|rise|more).*?\\b(?:is|to|=)\\s*${N}`, 'i'));
  if (m) return { kind: 'reverse-increase', a: Number(m[1]), b: Number(m[3]) };
  m = s.match(new RegExp(`${N}\\s*%\\s*(decrease|discount|off|less|reduction).*?\\b(?:is|to|=)\\s*${N}`, 'i'));
  if (m) return { kind: 'reverse-decrease', a: Number(m[1]), b: Number(m[3]) };

  // "increase 80 by 15%"
  m = s.match(new RegExp(`(?:increase|raise|add).*?${N}\\s*by\\s*${N}\\s*%`, 'i'));
  if (m) return { kind: 'increase', a: Number(m[1]), b: Number(m[2]) };
  m = s.match(new RegExp(`(?:decrease|reduce|discount|subtract).*?${N}\\s*by\\s*${N}\\s*%`, 'i'));
  if (m) return { kind: 'decrease', a: Number(m[1]), b: Number(m[2]) };

  // "80 increased by 15%"
  m = s.match(new RegExp(`${N}\\s*(?:increased|raised)\\s*by\\s*${N}\\s*%`, 'i'));
  if (m) return { kind: 'increase', a: Number(m[1]), b: Number(m[2]) };
  m = s.match(new RegExp(`${N}\\s*(?:decreased|reduced)\\s*by\\s*${N}\\s*%`, 'i'));
  if (m) return { kind: 'decrease', a: Number(m[1]), b: Number(m[2]) };

  // "what percentage is 30 of 150" / "30 as a percentage of 150"
  m = s.match(new RegExp(`${N}\\s*(?:as\\s*a?\\s*)?(?:percent(?:age)?|%)${OF}${N}`, 'i'));
  if (m && /percent/i.test(s) && !/^\s*-?\d+(\.\d+)?\s*%/.test(s)) {
    return { kind: 'express', a: Number(m[1]), b: Number(m[2]) };
  }
  m = s.match(new RegExp(`percentage${OF}?${N}\\s*(?:is|out of)\\s*${N}`, 'i'));
  if (m) return { kind: 'express', a: Number(m[2]), b: Number(m[1]) };

  // "20% of 150" — the plain case, and the fallback.
  m = s.match(new RegExp(`${N}\\s*%${OF}${N}`, 'i'));
  if (m) return { kind: 'of', a: Number(m[1]), b: Number(m[2]) };

  throw new Error('Try  20% of 150,  increase 80 by 15%,  or  30 as a percentage of 150.');
}

function decimalStep(pct: number): Step {
  return {
    note: 'Write the percentage as a decimal by dividing by 100.',
    latex: `${fmt(pct, 6)}\\% = \\dfrac{${fmt(pct, 6)}}{100} = ${fmt(pct / 100, 6)}`,
  };
}

export const percentageSolver: Solver = {
  id: 'percentages',
  title: 'Percentages',
  subjects: ['Foundations', 'General'],
  blurb: 'Percentage of an amount, percentage change, and reverse problems.',
  placeholder: 'e.g.  20% of 150   or   increase 80 by 15%',
  methods: [
    { id: 'auto', name: 'What it needs', blurb: 'Reads the wording and picks the right percentage calculation.' },
    { id: 'decimal', name: 'Decimal multiplier', blurb: 'Turn the percentage into a decimal and multiply — the quickest route.' },
    { id: 'unitary', name: 'Unitary method', blurb: 'Find 1% first, then scale up. Clear to follow and easy to check.' },
  ],
  defaultMethodId: 'auto',
  detect(input) {
    if (!/%|percent/i.test(input)) return 0;
    // Interest problems mention a rate and a time; those belong to finance.
    if (/interest|invest|loan|compound|deprec|per annum|\bp\.?a\.?\b|years?/i.test(input)) return 0;
    try {
      parse(input);
    } catch {
      return 0;
    }
    return 0.9;
  },
  solve(input, methodId): SolveResult {
    let p: Parsed;
    try {
      p = parse(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that percentage.' };
    }
    const { kind, a, b } = p;
    const steps: Step[] = [];

    if (kind === 'of') {
      const value = (a / 100) * b;
      if (methodId === 'unitary') {
        steps.push({ note: 'Find 1% first by dividing by 100.', latex: `1\\% \\text{ of } ${fmt(b)} = \\dfrac{${fmt(b)}}{100} = ${fmt(b / 100, 6)}` });
        steps.push({ note: `Multiply by ${fmt(a)} to get ${fmt(a)}%.`, latex: `${fmt(a)}\\% = ${fmt(b / 100, 6)} \\times ${fmt(a)} = ${fmt(value)}`, annotation: 'answer' });
      } else {
        steps.push(decimalStep(a));
        steps.push({ note: 'Multiply the amount by that decimal.', latex: `${fmt(a / 100, 6)} \\times ${fmt(b)} = ${fmt(value)}`, annotation: 'answer' });
      }
      return done(`Work out $${fmt(a)}\\%$ of $${fmt(b)}$`, methodId === 'unitary' ? 'Unitary method' : 'Decimal multiplier', steps, fmt(value));
    }

    if (kind === 'increase' || kind === 'decrease') {
      const up = kind === 'increase';
      // Both wordings ("increase 80 by 15%" and "80 increased by 15%") are
      // parsed to (amount, percent), so the labels are the same either way.
      const amount = a;
      const pct = b;
      const f = up ? 1 + pct / 100 : 1 - pct / 100;
      const value = amount * f;
      if (methodId === 'unitary') {
        const part = (pct / 100) * amount;
        steps.push({ note: `Find ${fmt(pct)}% of the amount.`, latex: `${fmt(pct)}\\% \\text{ of } ${fmt(amount)} = ${fmt(part)}` });
        steps.push({
          note: up ? 'Add it on.' : 'Take it off.',
          latex: `${fmt(amount)} ${up ? '+' : '-'} ${fmt(part)} = ${fmt(value)}`,
          annotation: 'answer',
        });
      } else {
        steps.push({
          note: `A ${fmt(pct)}% ${up ? 'increase' : 'decrease'} means the new value is ${up ? '100 + ' + fmt(pct) : '100 - ' + fmt(pct)} = ${fmt(up ? 100 + pct : 100 - pct)}% of the old one.`,
          latex: `\\text{multiplier} = \\dfrac{${fmt(up ? 100 + pct : 100 - pct)}}{100} = ${fmt(f, 6)}`,
        });
        steps.push({ note: 'Multiply by the multiplier.', latex: `${fmt(amount)} \\times ${fmt(f, 6)} = ${fmt(value)}`, annotation: 'answer' });
      }
      return done(
        `${up ? 'Increase' : 'Decrease'} $${fmt(amount)}$ by $${fmt(pct)}\\%$`,
        methodId === 'unitary' ? 'Unitary method' : 'Decimal multiplier',
        steps,
        fmt(value),
      );
    }

    if (kind === 'express') {
      if (b === 0) return { ok: false, error: 'You can’t express a number as a percentage of zero.' };
      const value = (a / b) * 100;
      steps.push({ note: 'Write it as a fraction of the whole.', latex: `\\dfrac{${fmt(a)}}{${fmt(b)}}` });
      steps.push({ note: 'Multiply by 100 to turn the fraction into a percentage.', latex: `\\dfrac{${fmt(a)}}{${fmt(b)}} \\times 100 = ${fmt(value)}\\%`, annotation: 'answer' });
      return done(`Express $${fmt(a)}$ as a percentage of $${fmt(b)}$`, 'As a percentage', steps, `${fmt(value)}\\%`);
    }

    // Reverse: the stated value is already the changed one.
    const up = kind === 'reverse-increase';
    const f = up ? 1 + a / 100 : 1 - a / 100;
    if (f === 0) return { ok: false, error: 'A 100% decrease leaves nothing to work back from.' };
    const original = b / f;
    steps.push({
      note: `After a ${fmt(a)}% ${up ? 'increase' : 'decrease'}, the new value is ${fmt(f * 100)}% of the original.`,
      latex: `\\text{new} = \\text{original} \\times ${fmt(f, 6)}`,
    });
    steps.push({ note: 'Divide to undo the multiplication.', latex: `\\text{original} = \\dfrac{${fmt(b)}}{${fmt(f, 6)}} = ${fmt(original)}`, annotation: 'original value' });
    steps.push({ note: 'Check by applying the change forwards.', latex: `${fmt(original)} \\times ${fmt(f, 6)} = ${fmt(original * f)}`, annotation: 'checks out' });
    return done(`Find the original value before a $${fmt(a)}\\%$ ${up ? 'increase' : 'decrease'}`, 'Reverse percentage', steps, fmt(original));
  },
};

function done(headline: string, methodName: string, steps: Step[], answerLatex: string): SolveResult {
  return { ok: true, solution: { headline, methodName, steps, answerLatex } };
}
