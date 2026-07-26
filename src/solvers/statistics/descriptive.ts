import { fmt } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Pull the data values out of the input.
 *
 * Extracting numbers directly beats stripping known words: a student can write
 * "standard deviation of 2, 4, 4" and any wording around the list is ignored.
 */
function readData(input: string): number[] {
  const found = input.match(/-?\d+(?:\.\d+)?/g);
  return found ? found.map(Number) : [];
}

/**
 * Descriptive statistics (SACE Stage 1 Methods "Counting and Statistics",
 * Stage 1/2 General "Statistical investigation").
 */

/** Quartile by the median-of-halves rule taught in SACE. */
function quartiles(sorted: number[]): { q1: number; q2: number; q3: number } {
  const n = sorted.length;
  const median = (arr: number[]): number => {
    const m = arr.length;
    return m % 2 === 1 ? arr[(m - 1) / 2] : (arr[m / 2 - 1] + arr[m / 2]) / 2;
  };
  const half = Math.floor(n / 2);
  const lower = sorted.slice(0, half);
  const upper = n % 2 === 1 ? sorted.slice(half + 1) : sorted.slice(half);
  return { q1: median(lower), q2: median(sorted), q3: median(upper) };
}

function modes(xs: number[]): number[] {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  const max = Math.max(...counts.values());
  if (max === 1) return []; // every value appears once → no mode
  return [...counts.entries()].filter(([, c]) => c === max).map(([v]) => v).sort((a, b) => a - b);
}

export const statisticsSolver: Solver = {
  id: 'statistics',
  title: 'Statistics',
  subjects: ['General', 'Methods'],
  blurb: 'Mean, median, mode, spread and the five-number summary.',
  placeholder: 'e.g.  4, 8, 15, 16, 23, 42',
  methods: [
    { id: 'summary', name: 'Full summary', blurb: 'Centre, spread and the five-number summary all at once.' },
    { id: 'centre', name: 'Centre', blurb: 'Mean, median and mode — the measures of central tendency.' },
    { id: 'spread', name: 'Spread', blurb: 'Range, variance and standard deviation.' },
    { id: 'five-number', name: 'Five-number summary', blurb: 'Minimum, Q1, median, Q3, maximum — and the IQR for a boxplot.' },
  ],
  defaultMethodId: 'summary',
  detect(input) {
    // A plain list of four or more numbers is almost always a data set…
    if (!/,/.test(input) || /=/.test(input)) return 0;
    const list = readData(input);
    if (list.length < 4) return 0;
    const explicit = /mean|median|mode|average|deviation|quartile|statistic|spread|summary/i.test(input);
    if (explicit) return 0.97;
    // …unless it follows a constant pattern, in which case it is a sequence.
    const d = list[1] - list[0];
    const isArithmetic = list.every((v, i) => i === 0 || Math.abs(v - list[i - 1] - d) < 1e-9);
    const isGeometric =
      list[0] !== 0 && list.every((v, i) => i === 0 || Math.abs(v - list[i - 1] * (list[1] / list[0])) < 1e-9);
    return isArithmetic || isGeometric ? 0.5 : 0.88;
  },
  solve(input, methodId): SolveResult {
    const xs = readData(input);
    if (xs.length < 2) return { ok: false, error: 'Give at least two data values, e.g.  4, 8, 15, 16, 23, 42.' };

    const n = xs.length;
    const sorted = [...xs].sort((a, b) => a - b);
    const total = xs.reduce((s, x) => s + x, 0);
    const mean = total / n;
    const { q1, q2: median, q3 } = quartiles(sorted);
    const mo = modes(xs);
    const range = sorted[n - 1] - sorted[0];
    const sqDiffs = xs.map((x) => (x - mean) ** 2);
    const sumSq = sqDiffs.reduce((s, x) => s + x, 0);
    const popVar = sumSq / n;
    const sampVar = n > 1 ? sumSq / (n - 1) : 0;

    const wants = (k: string) => methodId === 'summary' || methodId === k;
    const steps: Step[] = [
      {
        note: `Put the ${n} values in order — that makes the median and quartiles easy to read off.`,
        latex: sorted.map((x) => fmt(x)).join(',\\; '),
        annotation: `n = ${n}`,
      },
    ];

    if (wants('centre')) {
      steps.push({ note: 'The mean is the total divided by how many values there are.', latex: `\\bar{x} = \\dfrac{\\sum x}{n} = \\dfrac{${fmt(total)}}{${n}} = ${fmt(mean, 4)}` });
      steps.push({
        note:
          n % 2 === 1
            ? 'With an odd number of values the median is the middle one.'
            : 'With an even number of values the median is the mean of the middle two.',
        latex: `\\text{median} = ${fmt(median, 4)}`,
      });
      steps.push({
        note: mo.length === 0 ? 'Every value appears the same number of times, so there is no mode.' : 'The mode is the most common value.',
        latex: mo.length === 0 ? `\\text{no mode}` : `\\text{mode} = ${mo.map((m) => fmt(m)).join(',\\; ')}`,
      });
    }

    if (wants('spread')) {
      steps.push({ note: 'The range is the largest value minus the smallest.', latex: `\\text{range} = ${fmt(sorted[n - 1])} - ${fmt(sorted[0])} = ${fmt(range)}` });
      steps.push({
        note: 'For the standard deviation, find how far each value is from the mean, square those, and add them up.',
        latex: `\\sum (x - \\bar{x})^{2} = ${fmt(sumSq, 4)}`,
      });
      steps.push({
        note: 'Divide by n for the population variance, or by n − 1 for a sample.',
        latex: `\\sigma^{2} = \\dfrac{${fmt(sumSq, 4)}}{${n}} = ${fmt(popVar, 4)}, \\qquad s^{2} = \\dfrac{${fmt(sumSq, 4)}}{${n - 1}} = ${fmt(sampVar, 4)}`,
      });
      steps.push({
        note: 'Take the square root of each.',
        latex: `\\sigma = ${fmt(Math.sqrt(popVar), 4)}, \\qquad s = ${fmt(Math.sqrt(sampVar), 4)}`,
        annotation: 'population, then sample',
      });
    }

    if (wants('five-number')) {
      steps.push({
        note: 'Split the ordered data in half; the quartiles are the medians of each half.',
        latex: `Q_1 = ${fmt(q1, 4)}, \\quad Q_2 = ${fmt(median, 4)}, \\quad Q_3 = ${fmt(q3, 4)}`,
      });
      steps.push({
        note: 'The five-number summary is what a boxplot is drawn from.',
        latex: `${fmt(sorted[0])},\\; ${fmt(q1, 4)},\\; ${fmt(median, 4)},\\; ${fmt(q3, 4)},\\; ${fmt(sorted[n - 1])}`,
        annotation: 'min, Q₁, median, Q₃, max',
      });
      steps.push({ note: 'The interquartile range measures the spread of the middle half.', latex: `\\text{IQR} = ${fmt(q3, 4)} - ${fmt(q1, 4)} = ${fmt(q3 - q1, 4)}` });
      steps.push({
        note: 'Drawn as a boxplot — the box spans the middle half of the data.',
        visual: {
          kind: 'box-plot',
          data: { min: sorted[0], q1, median, q3, max: sorted[n - 1] },
        },
        annotation: 'the boxplot',
      });
    }

    const answer =
      methodId === 'spread'
        ? `s = ${fmt(Math.sqrt(sampVar), 4)}, \\quad \\text{range} = ${fmt(range)}`
        : methodId === 'five-number'
          ? `${fmt(sorted[0])},\\; ${fmt(q1, 4)},\\; ${fmt(median, 4)},\\; ${fmt(q3, 4)},\\; ${fmt(sorted[n - 1])}`
          : `\\bar{x} = ${fmt(mean, 4)}, \\quad \\text{median} = ${fmt(median, 4)}, \\quad s = ${fmt(Math.sqrt(sampVar), 4)}`;

    return {
      ok: true,
      solution: {
        headline: `Summarise the data set ($n = ${n}$)`,
        methodName:
          methodId === 'centre'
            ? 'Measures of centre'
            : methodId === 'spread'
              ? 'Measures of spread'
              : methodId === 'five-number'
                ? 'Five-number summary'
                : 'Full summary',
        steps,
        answerLatex: answer,
      },
    };
  },
};
