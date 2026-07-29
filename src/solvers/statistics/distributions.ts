import { fmt, parseParams, formatParams, nCr } from '../../lib/math/num';
import type {
  Solver,
  Step,
  SolveResult,
  FieldSchema,
} from '../../lib/engine/types';

/**
 * Discrete and continuous random variables, and confidence intervals
 * (SACE Stage 2 Mathematical Methods, Topics 2, 5 and 6).
 */

/** Error function — Abramowitz & Stegun 7.1.26, accurate to about 1.5e-7. */
function erf(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Standard normal cumulative probability, P(Z < z). */
function phi(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Common two-tailed critical values, so the working shows the familiar number. */
function zStar(confidence: number): number {
  const table: Record<number, number> = {
    90: 1.645,
    95: 1.96,
    98: 2.326,
    99: 2.576,
  };
  return table[Math.round(confidence)] ?? 1.96;
}

const BINOMIAL_FIELDS: FieldSchema[] = [
  { id: 'n', label: 'Trials (n)', kind: 'number' },
  { id: 'p', label: 'Probability (p)', kind: 'number' },
  { id: 'x', label: 'Successes (x)', kind: 'number', optional: true },
];
const NORMAL_FIELDS: FieldSchema[] = [
  { id: 'mean', label: 'Mean (μ)', kind: 'number' },
  { id: 'sd', label: 'SD (σ)', kind: 'number' },
  { id: 'x', label: 'Value (x)', kind: 'number' },
];
const NORMAL_INTERVAL_FIELDS: FieldSchema[] = [
  { id: 'mean', label: 'Mean (μ)', kind: 'number' },
  { id: 'sd', label: 'SD (σ)', kind: 'number' },
  { id: 'lower', label: 'Lower bound', kind: 'number', optional: true },
  { id: 'upper', label: 'Upper bound', kind: 'number', optional: true },
];
const SAMPLING_FIELDS: FieldSchema[] = [
  { id: 'mean', label: 'Population mean (μ)', kind: 'number' },
  { id: 'sd', label: 'Population SD (σ)', kind: 'number' },
  { id: 'n', label: 'Sample size (n)', kind: 'number' },
  { id: 'xbar', label: 'Sample mean (x̄)', kind: 'number', optional: true },
];
const CONFIDENCE_FIELDS: FieldSchema[] = [
  { id: 'mean', label: 'Sample mean', kind: 'number' },
  { id: 'sd', label: 'Sample SD', kind: 'number' },
  { id: 'n', label: 'Sample size (n)', kind: 'number' },
  { id: 'confidence', label: 'Confidence %', kind: 'number', optional: true },
];

export const distributionsSolver: Solver = {
  id: 'distributions',
  title: 'Random variables',
  subjects: ['Methods'],
  blurb: 'Binomial and normal distributions, and confidence intervals.',
  placeholder: 'e.g.  binomial n=10, p=0.5, x=3',
  methods: [
    {
      id: 'binomial',
      name: 'Binomial',
      blurb:
        'P(X = x) = ⁿCₓ pˣ(1−p)ⁿ⁻ˣ for a fixed number of independent trials.',
      fields: BINOMIAL_FIELDS,
      serialize: formatParams,
    },
    {
      id: 'normal',
      name: 'Normal',
      blurb: 'Standardise to a z-score, then read the probability.',
      fields: NORMAL_FIELDS,
      serialize: formatParams,
    },
    {
      id: 'normal-interval',
      name: 'Normal interval',
      blurb:
        'Find a lower-tail, upper-tail or between-values probability from a normal model.',
      fields: NORMAL_INTERVAL_FIELDS,
      serialize: formatParams,
    },
    {
      id: 'sampling',
      name: 'Sampling distribution',
      blurb:
        'Find the mean and standard error of x̄, or standardise a sample mean.',
      fields: SAMPLING_FIELDS,
      serialize: formatParams,
    },
    {
      id: 'confidence',
      name: 'Confidence interval',
      blurb:
        'x̄ ± z* σ/√n for a population mean. Leave confidence blank for 95%.',
      fields: CONFIDENCE_FIELDS,
      serialize: formatParams,
    },
  ],
  defaultMethodId: 'binomial',
  detect(input) {
    const l = input.toLowerCase();
    const p = parseParams(input);
    if (/binomial/.test(l) && p.n !== undefined && p.p !== undefined)
      return 0.97;
    if (/normal|z.?score|standardise|standardize/.test(l) && p.sd !== undefined)
      return 0.97;
    if (
      /sampling|sample mean|sampling distribution|x.?bar|x̄/.test(l) &&
      p.n !== undefined
    )
      return 0.97;
    if (/confidence|interval/.test(l) && p.n !== undefined) return 0.97;
    // The shape of the data identifies the distribution even when the student
    // never names it — "probability of exactly 3 heads in 10 flips, p=0.5".
    if (p.n !== undefined && p.p !== undefined && p.x !== undefined) return 0.9;
    if (p.mean !== undefined && p.sd !== undefined) return 0.9;
    return 0;
  },
  solve(input, methodId): SolveResult {
    const p = parseParams(input);
    const l = input.toLowerCase();
    const asked = /binomial/.test(l)
      ? 'binomial'
      : /sampling|sample mean|sampling distribution|x.?bar|x̄/.test(l)
        ? 'sampling'
        : /normal.*(?:between|above|below|greater|less)|(?:between|above|below|greater|less).*normal/.test(
              l,
            )
          ? 'normal-interval'
          : /confidence/.test(l)
            ? 'confidence'
            : /normal|z.?score/.test(l)
              ? 'normal'
              : methodId;

    if (asked === 'binomial') {
      const n = p.n;
      const prob = p.p;
      const x = p.x ?? p.r;
      if (n === undefined || prob === undefined) {
        return {
          ok: false,
          error:
            'Give the number of trials and the probability, e.g.  binomial n=10, p=0.5, x=3.',
        };
      }
      if (prob < 0 || prob > 1)
        return { ok: false, error: 'A probability must be between 0 and 1.' };
      if (!Number.isInteger(n) || n < 0)
        return {
          ok: false,
          error: 'The number of trials must be a whole number.',
        };

      const mean = n * prob;
      const variance = n * prob * (1 - prob);
      const steps: Step[] = [
        {
          note: 'A binomial random variable counts successes in a fixed number of independent trials.',
          latex: `X \\sim \\text{Bin}(n = ${n},\\; p = ${fmt(prob, 4)})`,
        },
      ];

      if (x === undefined) {
        steps.push({
          note: 'The mean (expected number of successes) is np.',
          latex: `E(X) = np = ${n} \\times ${fmt(prob, 4)} = ${fmt(mean, 4)}`,
        });
        steps.push({
          note: 'The variance is np(1 − p).',
          latex: `\\text{Var}(X) = np(1-p) = ${fmt(variance, 4)}`,
        });
        steps.push({
          note: 'The standard deviation is its square root.',
          latex: `\\sigma = ${fmt(Math.sqrt(variance), 4)}`,
          annotation: 'spread',
        });
        return {
          ok: true,
          solution: {
            headline: `Describe $X \\sim \\text{Bin}(${n}, ${fmt(prob, 4)})$`,
            methodName: 'Binomial distribution',
            steps,
            answerLatex: `E(X) = ${fmt(mean, 4)}, \\quad \\sigma = ${fmt(Math.sqrt(variance), 4)}`,
          },
        };
      }

      if (!Number.isInteger(x) || x < 0 || x > n) {
        return {
          ok: false,
          error: `x must be a whole number between 0 and ${n}.`,
        };
      }
      const c = nCr(n, x);
      const px = c * Math.pow(prob, x) * Math.pow(1 - prob, n - x);
      steps.push({
        note: 'Write down the binomial probability formula.',
        latex: `P(X = x) = \\binom{n}{x} p^{x}(1-p)^{\\,n-x}`,
      });
      steps.push({
        note: 'Count the ways to choose which trials succeed.',
        latex: `\\binom{${n}}{${x}} = ${c}`,
      });
      steps.push({
        note: 'Substitute everything into the formula.',
        latex: `P(X = ${x}) = ${c} \\times (${fmt(prob, 4)})^{${x}} \\times (${fmt(1 - prob, 4)})^{${n - x}}`,
      });
      steps.push({
        note: 'Work it out.',
        latex: `P(X = ${x}) = ${fmt(px, 6)}`,
        annotation: 'probability',
      });
      steps.push({
        note: 'For reference, the mean and standard deviation of this distribution:',
        latex: `E(X) = ${fmt(mean, 4)}, \\quad \\sigma = ${fmt(Math.sqrt(variance), 4)}`,
      });

      return {
        ok: true,
        solution: {
          headline: `Find $P(X = ${x})$ for $X \\sim \\text{Bin}(${n}, ${fmt(prob, 4)})$`,
          methodName: 'Binomial distribution',
          steps,
          answerLatex: `P(X = ${x}) = ${fmt(px, 6)}`,
        },
      };
    }

    if (asked === 'confidence') {
      const mean = p.mean ?? p.xbar ?? p.x;
      const sd = p.sd ?? p.sigma ?? p.s;
      const n = p.n;
      const level = p.confidence ?? p.level ?? p.c ?? 95;
      if (mean === undefined || sd === undefined || n === undefined) {
        return {
          ok: false,
          error:
            'Give the sample mean, standard deviation and sample size, e.g.  confidence mean=50, sd=8, n=100.',
        };
      }
      if (n <= 0 || sd < 0)
        return {
          ok: false,
          error:
            'The sample size must be positive and the standard deviation cannot be negative.',
        };
      if (![90, 95, 98, 99].some((allowed) => Math.abs(level - allowed) < 1e-9))
        return {
          ok: false,
          error: 'Use a 90%, 95%, 98% or 99% confidence level.',
        };

      const z = zStar(level);
      const se = sd / Math.sqrt(n);
      const margin = z * se;
      return {
        ok: true,
        solution: {
          headline: `Find a $${fmt(level)}\\%$ confidence interval for the population mean`,
          methodName: 'Confidence interval',
          steps: [
            {
              note: 'Write down the sample statistics.',
              latex: `\\bar{x} = ${fmt(mean, 4)}, \\quad \\sigma = ${fmt(sd, 4)}, \\quad n = ${fmt(n)}`,
            },
            {
              note: `For ${fmt(level)}% confidence the critical value is:`,
              latex: `z^{*} = ${fmt(z, 3)}`,
              annotation: 'from the standard normal',
            },
            {
              note: 'Find the standard error of the mean.',
              latex: `\\text{SE} = \\dfrac{\\sigma}{\\sqrt{n}} = \\dfrac{${fmt(sd, 4)}}{\\sqrt{${fmt(n)}}} = ${fmt(se, 6)}`,
            },
            {
              note: 'The margin of error is the critical value times the standard error.',
              latex: `E = z^{*} \\times \\text{SE} = ${fmt(z, 3)} \\times ${fmt(se, 6)} = ${fmt(margin, 6)}`,
            },
            {
              note: 'The interval runs one margin either side of the sample mean.',
              latex: `\\bar{x} \\pm E = ${fmt(mean, 4)} \\pm ${fmt(margin, 4)}`,
            },
            {
              note: 'So the confidence interval is:',
              latex: `\\left(${fmt(mean - margin, 4)},\\; ${fmt(mean + margin, 4)}\\right)`,
              annotation: `${fmt(level)}% confident`,
            },
          ],
          answerLatex: `\\left(${fmt(mean - margin, 4)},\\; ${fmt(mean + margin, 4)}\\right)`,
          derivedValues: { confidence: level },
        },
      };
    }

    if (asked === 'sampling') {
      const mean = p.mean ?? p.mu ?? p.m;
      const sd = p.sd ?? p.sigma ?? p.s;
      const n = p.n;
      const xbar = p.xbar ?? p['x̄'] ?? p.samplemean;
      if (mean === undefined || sd === undefined || n === undefined) {
        return {
          ok: false,
          error:
            'Give the population mean, population SD and sample size, e.g.  sampling mean=50, sd=8, n=100.',
        };
      }
      if (sd <= 0 || n <= 0)
        return {
          ok: false,
          error: 'The population SD and sample size must both be positive.',
        };
      const se = sd / Math.sqrt(n);
      const steps: Step[] = [
        {
          note: 'The sampling distribution of the sample mean is centred on the population mean.',
          latex: `\\mu_{\\bar{x}} = \\mu = ${fmt(mean, 4)}`,
        },
        {
          note: 'Its standard deviation is the standard error, the population SD divided by √n.',
          latex: `\\sigma_{\\bar{x}} = \\dfrac{\\sigma}{\\sqrt{n}} = \\dfrac{${fmt(sd, 4)}}{\\sqrt{${fmt(n)}}} = ${fmt(se, 6)}`,
          annotation: 'standard error',
        },
      ];
      if (xbar === undefined) {
        return {
          ok: true,
          solution: {
            headline: `Sampling distribution of $\\bar{x}$`,
            methodName: 'Sampling distribution',
            steps,
            answerLatex: `\\bar{x} \\sim N(${fmt(mean, 4)}, ${fmt(se, 4)}^{2})`,
          },
        };
      }
      const z = (xbar - mean) / se;
      const probability = phi(z);
      steps.push(
        {
          note: 'Standardise the sample mean using the sampling distribution.',
          latex: `z = \\dfrac{\\bar{x} - \\mu}{\\sigma_{\\bar{x}}} = \\dfrac{${fmt(xbar, 4)} - ${fmt(mean, 4)}}{${fmt(se, 6)}} = ${fmt(z, 4)}`,
        },
        {
          note: 'Read the lower-tail probability from the standard normal distribution.',
          latex: `P(\\bar{x} \\le ${fmt(xbar, 4)}) = \\Phi(${fmt(z, 4)}) = ${fmt(probability, 6)}`,
          annotation: 'probability',
        },
      );
      return {
        ok: true,
        solution: {
          headline: `Find P(\\bar{x} \\le ${fmt(xbar, 4)})`,
          methodName: 'Sampling distribution',
          steps,
          answerLatex: `P(\\bar{x} \\le ${fmt(xbar, 4)}) = ${fmt(probability, 6)}`,
        },
      };
    }

    if (asked === 'normal-interval') {
      const mean = p.mean ?? p.mu ?? p.m;
      const sd = p.sd ?? p.sigma ?? p.s;
      let lower = p.lower ?? p.min;
      let upper = p.upper ?? p.max;
      const between = input.match(
        /between\s*(-?\d*\.?\d+)\s*and\s*(-?\d*\.?\d+)/i,
      );
      if (between) {
        lower ??= Number(between[1]);
        upper ??= Number(between[2]);
      }
      const below = input.match(
        /(?:below|less\s+than|at\s+most)\s*(-?\d*\.?\d+)/i,
      );
      const above = input.match(
        /(?:above|greater\s+than|at\s+least)\s*(-?\d*\.?\d+)/i,
      );
      if (below) upper ??= Number(below[1]);
      if (above) lower ??= Number(above[1]);
      if (
        mean === undefined ||
        sd === undefined ||
        (lower === undefined && upper === undefined)
      ) {
        return {
          ok: false,
          error:
            'Give mean, SD and a lower or upper bound, e.g.  normal between 80 and 120, mean=100, sd=15.',
        };
      }
      if (sd <= 0)
        return { ok: false, error: 'The standard deviation must be positive.' };
      const lowerZ = lower === undefined ? -Infinity : (lower - mean) / sd;
      const upperZ = upper === undefined ? Infinity : (upper - mean) / sd;
      if (lower !== undefined && upper !== undefined && lower > upper)
        return {
          ok: false,
          error: 'The lower bound must not exceed the upper bound.',
        };
      const probability = phi(upperZ) - phi(lowerZ);
      const bounds =
        lower === undefined
          ? `X \\ge ${fmt(upper!)}`
          : upper === undefined
            ? `X \\le ${fmt(lower)}`
            : `${fmt(lower)} \\le X \\le ${fmt(upper)}`;
      return {
        ok: true,
        solution: {
          headline: `Find P(${bounds}) for a normal variable`,
          methodName: 'Normal interval',
          steps: [
            {
              note: 'Standardise each bound with z = (x − μ)/σ.',
              latex: `z_{lower} = ${Number.isFinite(lowerZ) ? fmt(lowerZ, 4) : '-\\infty'}, \\quad z_{upper} = ${Number.isFinite(upperZ) ? fmt(upperZ, 4) : '+\\infty'}`,
            },
            {
              note: 'Subtract the standard normal cumulative probabilities.',
              latex: `P(${bounds}) = \\Phi(z_{upper}) - \\Phi(z_{lower}) = ${fmt(probability, 6)}`,
              annotation: 'probability',
            },
          ],
          answerLatex: `P(${bounds}) = ${fmt(probability, 6)}`,
        },
      };
    }

    // Normal distribution.
    const mean = p.mean ?? p.mu ?? p.m;
    const sd = p.sd ?? p.sigma ?? p.s;
    const x = p.x;
    if (mean === undefined || sd === undefined || x === undefined) {
      return {
        ok: false,
        error:
          'Give the mean, standard deviation and value, e.g.  normal mean=100, sd=15, x=120.',
      };
    }
    if (sd <= 0)
      return { ok: false, error: 'The standard deviation must be positive.' };

    const z = (x - mean) / sd;
    const below = phi(z);
    return {
      ok: true,
      solution: {
        headline: `Find $P(X < ${fmt(x)})$ for $X \\sim N(${fmt(mean)}, ${fmt(sd)}^{2})$`,
        methodName: 'Normal distribution',
        steps: [
          {
            note: 'Write down the distribution.',
            latex: `X \\sim N(\\mu = ${fmt(mean)},\\; \\sigma = ${fmt(sd)})`,
          },
          {
            note: 'Standardise: how many standard deviations from the mean is this value?',
            latex: `z = \\dfrac{x - \\mu}{\\sigma}`,
          },
          {
            note: 'Substitute the values.',
            latex: `z = \\dfrac{${fmt(x)} - ${fmt(mean)}}{${fmt(sd)}} = ${fmt(z, 4)}`,
            annotation: `${fmt(Math.abs(z), 2)} SD ${z < 0 ? 'below' : 'above'} the mean`,
          },
          {
            note: 'Read the probability below that z-score from the standard normal.',
            latex: `P(X < ${fmt(x)}) = P(Z < ${fmt(z, 4)}) = ${fmt(below, 4)}`,
          },
          {
            note: 'The probability above is whatever is left.',
            latex: `P(X > ${fmt(x)}) = 1 - ${fmt(below, 4)} = ${fmt(1 - below, 4)}`,
            annotation: 'the two add to 1',
          },
          {
            note: 'The shaded area is the probability you just found.',
            visual: {
              kind: 'normal',
              data: {
                mean,
                sd,
                lo: null,
                hi: x,
                label: `P(X < ${fmt(x)}) = ${fmt(below, 4)}`,
              },
            },
            annotation: 'area under the curve',
          },
        ],
        answerLatex: `P(X < ${fmt(x)}) = ${fmt(below, 4)}`,
      },
    };
  },
};
