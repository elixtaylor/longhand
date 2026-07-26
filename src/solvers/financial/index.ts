import { fmt, money, parseParams } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Investing and borrowing (SACE General Mathematics): simple interest,
 * compound interest, depreciation and loan repayments.
 */
interface Finance {
  P: number; // principal
  r: number; // annual rate as a percentage
  t: number; // time in years
  n: number; // compounding periods per year
}

/** Compounding frequency from the words students actually use. */
function frequency(input: string): { n: number; word: string } {
  const l = input.toLowerCase();
  if (/monthly|per month|a month/.test(l)) return { n: 12, word: 'monthly' };
  if (/fortnight/.test(l)) return { n: 26, word: 'fortnightly' };
  if (/weekly|per week/.test(l)) return { n: 52, word: 'weekly' };
  if (/quarter/.test(l)) return { n: 4, word: 'quarterly' };
  if (/dai?ly/.test(l)) return { n: 365, word: 'daily' };
  if (/half.?year|semi.?annual|six.?month/.test(l)) return { n: 2, word: 'half-yearly' };
  return { n: 1, word: 'yearly' };
}

function read(input: string): Finance {
  const p = parseParams(input);
  const freq = frequency(input);

  let P = p.P ?? p.principal ?? p.amount;
  let r = p.r ?? p.rate ?? p.i;
  let t = p.t ?? p.years ?? p.time;
  const n = p.n ?? freq.n;

  // Fall back to plain English: "$5000 at 4% for 3 years".
  let rest = input;
  const pct = input.match(/(\d*\.?\d+)\s*%/);
  if (pct) {
    if (r === undefined) r = Number(pct[1]);
    rest = rest.replace(pct[0], ' ');
  }
  const yrs = rest.match(/(\d*\.?\d+)\s*(?:years?|yrs?)/i);
  if (yrs) {
    if (t === undefined) t = Number(yrs[1]);
    rest = rest.replace(yrs[0], ' ');
  }
  if (P === undefined) {
    const cash = rest.match(/\$?\s*([\d,]+\.?\d*)/);
    if (cash) P = Number(cash[1].replace(/,/g, ''));
  }

  if (P === undefined || r === undefined || t === undefined) {
    throw new Error(
      'Give the amount, the rate and the time — e.g.  $5000 at 4% for 3 years  or  P=5000, r=4, t=3.',
    );
  }
  return { P, r, t, n };
}

const AUD = (x: number) => `\\$${money(x)}`;

/* -------------------------------------------------------- simple interest */
function simple(f: Finance): SolveResult {
  const { P, r, t } = f;
  const rate = r / 100;
  const I = P * rate * t;
  const steps: Step[] = [
    { note: 'Simple interest is charged on the original amount only.', latex: `I = P \\times r \\times t` },
    {
      note: 'Write the rate as a decimal, then substitute.',
      latex: `I = ${fmt(P)} \\times ${fmt(rate, 6)} \\times ${fmt(t)}`,
      annotation: `${fmt(r)}% = ${fmt(rate, 6)}`,
    },
    { note: 'Work out the interest.', latex: `I = ${AUD(I)}`, annotation: 'interest earned' },
    { note: 'Add it to the principal for the final balance.', latex: `A = ${AUD(P)} + ${AUD(I)} = ${AUD(P + I)}` },
  ];
  return {
    ok: true,
    solution: {
      headline: `Simple interest on $${money(P)}$ at $${fmt(r)}\\%$ for $${fmt(t)}$ years`,
      methodName: 'Simple interest',
      steps,
      answerLatex: `I = ${AUD(I)}, \\quad A = ${AUD(P + I)}`,
    },
  };
}

/* ------------------------------------------------------ compound interest */
function compound(f: Finance, input: string): SolveResult {
  const { P, r, t, n } = f;
  const rate = r / 100;
  const periods = n * t;
  const perPeriod = rate / n;
  const A = P * Math.pow(1 + perPeriod, periods);
  const word = frequency(input).word;

  const steps: Step[] = [
    { note: 'Compound interest earns interest on the interest already added.', latex: `A = P\\left(1 + \\dfrac{r}{n}\\right)^{nt}` },
    {
      note: `Interest is compounded ${word}, so $n = ${n}$.`,
      latex: `P = ${fmt(P)}, \\quad r = ${fmt(rate, 6)}, \\quad n = ${n}, \\quad t = ${fmt(t)}`,
    },
    {
      note: 'Substitute the values.',
      latex: `A = ${fmt(P)}\\left(1 + \\dfrac{${fmt(rate, 6)}}{${n}}\\right)^{${n} \\times ${fmt(t)}}`,
    },
    {
      note: 'Simplify inside the brackets and the index.',
      latex: `A = ${fmt(P)} \\times \\left(${fmt(1 + perPeriod, 8)}\\right)^{${fmt(periods)}}`,
    },
    { note: 'Work out the final amount.', latex: `A = ${AUD(A)}`, annotation: 'final balance' },
    { note: 'The interest is the growth on top of the principal.', latex: `I = ${AUD(A)} - ${AUD(P)} = ${AUD(A - P)}` },
  ];
  return {
    ok: true,
    solution: {
      headline: `Compound interest on $${money(P)}$ at $${fmt(r)}\\%$ for $${fmt(t)}$ years`,
      methodName: 'Compound interest',
      steps,
      answerLatex: `A = ${AUD(A)}, \\quad I = ${AUD(A - P)}`,
    },
  };
}

/* ----------------------------------------------------------- depreciation */
function depreciation(f: Finance): SolveResult {
  const { P, r, t } = f;
  const rate = r / 100;
  const A = P * Math.pow(1 - rate, t);
  const steps: Step[] = [
    { note: 'Reducing-balance depreciation takes a percentage off the value each year.', latex: `A = P(1 - r)^{t}` },
    { note: 'Substitute the values.', latex: `A = ${fmt(P)}(1 - ${fmt(rate, 6)})^{${fmt(t)}}` },
    { note: 'Simplify the bracket.', latex: `A = ${fmt(P)} \\times \\left(${fmt(1 - rate, 6)}\\right)^{${fmt(t)}}` },
    { note: 'Work out the depreciated value.', latex: `A = ${AUD(A)}`, annotation: 'value after depreciation' },
    { note: 'The total loss in value is the difference.', latex: `\\text{Loss} = ${AUD(P)} - ${AUD(A)} = ${AUD(P - A)}` },
  ];
  return {
    ok: true,
    solution: {
      headline: `Depreciate $${money(P)}$ at $${fmt(r)}\\%$ per year for $${fmt(t)}$ years`,
      methodName: 'Reducing-balance depreciation',
      steps,
      answerLatex: `A = ${AUD(A)}`,
    },
  };
}

/* ------------------------------------------------------- loan repayments */
function repayment(f: Finance, input: string): SolveResult {
  const { P, r, t, n } = f;
  const i = r / 100 / n;
  const N = n * t;
  const word = frequency(input).word;
  if (i === 0) {
    const R = P / N;
    return {
      ok: true,
      solution: {
        headline: `Repayments on a $${money(P)}$ loan`,
        methodName: 'Loan repayments',
        steps: [{ note: 'With no interest the loan is just split evenly.', latex: `R = \\dfrac{${fmt(P)}}{${fmt(N)}} = ${AUD(R)}` }],
        answerLatex: `R = ${AUD(R)}`,
      },
    };
  }
  const R = (P * i) / (1 - Math.pow(1 + i, -N));
  const total = R * N;

  const steps: Step[] = [
    { note: 'A reducing-balance loan uses the annuity (repayment) formula.', latex: `R = \\dfrac{P\\,i}{1 - (1 + i)^{-N}}` },
    {
      note: `Repayments are ${word}, so find the rate per period and the number of periods.`,
      latex: `i = \\dfrac{${fmt(r / 100, 6)}}{${n}} = ${fmt(i, 8)}, \\quad N = ${n} \\times ${fmt(t)} = ${fmt(N)}`,
    },
    {
      note: 'Substitute into the formula.',
      latex: `R = \\dfrac{${fmt(P)} \\times ${fmt(i, 8)}}{1 - (1 + ${fmt(i, 8)})^{-${fmt(N)}}}`,
    },
    { note: 'Work out each repayment.', latex: `R = ${AUD(R)}`, annotation: `per ${word.replace('ly', '')} period` },
    {
      note: 'Multiply by the number of repayments for the total repaid.',
      latex: `\\text{Total} = ${AUD(R)} \\times ${fmt(N)} = ${AUD(total)}`,
    },
    { note: 'The interest is whatever you paid above the loan itself.', latex: `\\text{Interest} = ${AUD(total)} - ${AUD(P)} = ${AUD(total - P)}` },
  ];
  return {
    ok: true,
    solution: {
      headline: `Repayments on a $${money(P)}$ loan at $${fmt(r)}\\%$ over $${fmt(t)}$ years`,
      methodName: 'Loan repayments',
      steps,
      answerLatex: `R = ${AUD(R)}`,
    },
  };
}

export const financialSolver: Solver = {
  id: 'financial',
  title: 'Investing & borrowing',
  subjects: ['General'],
  blurb: 'Simple and compound interest, depreciation and loan repayments.',
  placeholder: 'e.g.  $5000 at 4% for 3 years compound',
  methods: [
    { id: 'compound', name: 'Compound interest', blurb: 'A = P(1 + r/n)^(nt) — interest earns interest.' },
    { id: 'simple', name: 'Simple interest', blurb: 'I = Prt — interest on the original amount only.' },
    { id: 'depreciation', name: 'Depreciation', blurb: 'A = P(1 − r)^t — reducing-balance loss in value.' },
    { id: 'repayment', name: 'Loan repayments', blurb: 'The annuity formula for a reducing-balance loan.' },
  ],
  defaultMethodId: 'compound',
  detect(input) {
    const l = input.toLowerCase();
    const words = /interest|invest|borrow|loan|repay|deprec|compound|principal|savings|mortgage/.test(l);
    const hasPct = /%/.test(input) || /\br\s*=/.test(input);
    const hasTime = /years?|yrs?|\bt\s*=/.test(l);
    if (!hasPct || !hasTime) return 0;
    try {
      read(input);
    } catch {
      return 0;
    }
    return words ? 0.95 : 0.7;
  },
  solve(input, methodId): SolveResult {
    let f: Finance;
    try {
      f = read(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read those figures.' };
    }
    // Words in the problem beat the selected tab — they state the intent.
    const l = input.toLowerCase();
    const asked = /deprec/.test(l)
      ? 'depreciation'
      : /repay|loan|mortgage/.test(l)
        ? 'repayment'
        : /simple/.test(l)
          ? 'simple'
          : /compound/.test(l)
            ? 'compound'
            : methodId;

    if (asked === 'simple') return simple(f);
    if (asked === 'depreciation') return depreciation(f);
    if (asked === 'repayment') return repayment(f, input);
    return compound(f, input);
  },
};
