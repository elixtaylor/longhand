import { factorial, nCr, fmt } from '../../lib/math/num';
import type { Solver, Step, SolveResult, FieldSchema } from '../../lib/engine/types';

/**
 * Counting techniques (SACE Stage 1 Mathematical Methods): factorials,
 * permutations and combinations — the difference being whether order matters.
 */

interface Query {
  kind: 'factorial' | 'permutation' | 'combination';
  n: number;
  r: number;
}

function parse(input: string, methodId: string): Query {
  const s = input.replace(/\s+/g, '');

  let m = s.match(/^(\d+)!$/);
  if (m) return { kind: 'factorial', n: Number(m[1]), r: 0 };

  // 10C3, C(10,3), 10 choose 3
  m = s.match(/^(\d+)C(\d+)$/i) ?? s.match(/^C\((\d+),(\d+)\)$/i) ?? s.match(/^(\d+)choose(\d+)$/i);
  if (m) return { kind: 'combination', n: Number(m[1]), r: Number(m[2]) };

  m = s.match(/^(\d+)P(\d+)$/i) ?? s.match(/^P\((\d+),(\d+)\)$/i);
  if (m) return { kind: 'permutation', n: Number(m[1]), r: Number(m[2]) };

  // Worded: "how many ways can 5 people be arranged", "choose 3 from 10"
  const lower = input.toLowerCase();
  const nums = input.match(/\d+/g)?.map(Number) ?? [];
  if (/arrange|order|line\s*up|permutation/.test(lower) && nums.length >= 1) {
    if (nums.length === 1) return { kind: 'factorial', n: nums[0], r: 0 };
    return { kind: 'permutation', n: Math.max(nums[0], nums[1]), r: Math.min(nums[0], nums[1]) };
  }
  if (/choose|select|combination|committee|team/.test(lower) && nums.length >= 2) {
    return { kind: 'combination', n: Math.max(nums[0], nums[1]), r: Math.min(nums[0], nums[1]) };
  }

  if (nums.length >= 2) {
    return { kind: methodId === 'permutation' ? 'permutation' : 'combination', n: Math.max(nums[0], nums[1]), r: Math.min(nums[0], nums[1]) };
  }
  throw new Error('Try  10C3,  10P3,  5!,  or “choose 3 from 10”.');
}

const MAX_N = 170; // beyond this a factorial overflows to Infinity

const NR_FIELDS: FieldSchema[] = [
  { id: 'n', label: 'n', kind: 'number' },
  { id: 'r', label: 'r', kind: 'number' },
];
const N_FIELD: FieldSchema[] = [{ id: 'n', label: 'n', kind: 'number' }];

export const countingSolver: Solver = {
  id: 'counting',
  title: 'Counting & combinations',
  subjects: ['Methods'],
  blurb: 'Factorials, permutations and combinations.',
  placeholder: 'e.g.  10C3   or   choose 3 from 10   or   5!',
  methods: [
    {
      id: 'combination',
      name: 'Combination (nCr)',
      blurb: 'Order does not matter — picking a team from a group.',
      fields: NR_FIELDS,
      serialize: (v) => `${v.n[0]}C${v.r[0]}`,
    },
    {
      id: 'permutation',
      name: 'Permutation (nPr)',
      blurb: 'Order matters — arranging people in a line.',
      fields: NR_FIELDS,
      serialize: (v) => `${v.n[0]}P${v.r[0]}`,
    },
    {
      id: 'factorial',
      name: 'Factorial (n!)',
      blurb: 'Arrange every item — n × (n−1) × … × 1.',
      fields: N_FIELD,
      serialize: (v) => `${v.n[0]}!`,
    },
  ],
  defaultMethodId: 'combination',
  detect(input) {
    const s = input.replace(/\s+/g, '');
    if (/^\d+!$/.test(s)) return 0.96;
    if (/^\d+[CP]\d+$/i.test(s) || /^[CP]\(\d+,\d+\)$/i.test(s)) return 0.96;
    if (/\bchoose\b|\bcombination|\bpermutation|how many ways/i.test(input)) return 0.9;
    return 0;
  },
  solve(input, methodId): SolveResult {
    let q: Query;
    try {
      q = parse(input, methodId);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that.' };
    }
    const { kind, n, r } = q;

    if (n < 0 || r < 0) return { ok: false, error: 'Counting problems need non-negative whole numbers.' };
    if (n > MAX_N) return { ok: false, error: `That number is too large to work out exactly (keep n under ${MAX_N}).` };
    if (kind !== 'factorial' && r > n) {
      return { ok: false, error: `You can’t choose ${r} things from only ${n}.` };
    }

    if (kind === 'factorial') {
      const value = factorial(n);
      const expansion = n <= 12 ? Array.from({ length: n }, (_, i) => n - i).join(' \\times ') : `${n} \\times ${n - 1} \\times \\cdots \\times 1`;
      const steps: Step[] = [
        { note: 'A factorial counts the ways to arrange every item.', latex: `n! = n \\times (n-1) \\times \\cdots \\times 1` },
        { note: 'Write it out.', latex: `${n}! = ${expansion || '1'}` },
        { note: 'Multiply.', latex: `${n}! = ${fmt(value, 0)}`, annotation: 'arrangements' },
      ];
      return done(`Work out $${n}!$`, 'Factorial', steps, fmt(value, 0));
    }

    if (kind === 'permutation') {
      const value = factorial(n) / factorial(n - r);
      const terms = Array.from({ length: r }, (_, i) => n - i);
      const steps: Step[] = [
        { note: 'Order matters here, so use a permutation.', latex: `^{n}P_{r} = \\dfrac{n!}{(n-r)!}` },
        { note: 'Substitute the numbers.', latex: `^{${n}}P_{${r}} = \\dfrac{${n}!}{(${n}-${r})!} = \\dfrac{${n}!}{${n - r}!}` },
        { note: 'Most of the factorial cancels, leaving a short product.', latex: `= ${terms.join(' \\times ')}` },
        { note: 'Multiply.', latex: `^{${n}}P_{${r}} = ${fmt(value, 0)}`, annotation: 'ordered arrangements' },
      ];
      return done(`Work out $^{${n}}P_{${r}}$`, 'Permutation', steps, fmt(value, 0));
    }

    const value = nCr(n, r);
    const perm = factorial(n) / factorial(n - r);
    const topTerms = Array.from({ length: r }, (_, i) => n - i);
    const steps: Step[] = [
      { note: 'Order does not matter here, so use a combination.', latex: `^{n}C_{r} = \\dbinom{n}{r} = \\dfrac{n!}{r!\\,(n-r)!}` },
      { note: 'Substitute the numbers.', latex: `^{${n}}C_{${r}} = \\dfrac{${n}!}{${r}!\\,${n - r}!}` },
      { note: 'Cancel the larger factorial.', latex: `= \\dfrac{${topTerms.join(' \\times ')}}{${r}!} = \\dfrac{${fmt(perm, 0)}}{${fmt(factorial(r), 0)}}` },
      { note: 'Divide.', latex: `^{${n}}C_{${r}} = ${fmt(value, 0)}`, annotation: 'selections' },
      {
        note: 'Check with the symmetry rule — choosing what to leave out gives the same count.',
        latex: `\\dbinom{${n}}{${r}} = \\dbinom{${n}}{${n - r}} = ${fmt(nCr(n, n - r), 0)}`,
        annotation: 'checks out',
      },
    ];
    return done(`Work out $^{${n}}C_{${r}}$`, 'Combination', steps, fmt(value, 0));
  },
};

function done(headline: string, methodName: string, steps: Step[], answerLatex: string): SolveResult {
  return { ok: true, solution: { headline, methodName, steps, answerLatex } };
}
