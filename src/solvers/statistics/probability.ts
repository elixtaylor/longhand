import { Rational } from '../../lib/math/rational';
import { fmt, parseParams } from '../../lib/math/num';
import { rl } from '../../lib/math/format';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Probability (SACE Stage 1 Mathematical Methods — Counting and Statistics):
 * single events, complements, unions, and conditional probability.
 */

function asFractionAndDecimal(r: Rational): string {
  return r.isInt() ? rl(r) : `${rl(r)} = ${fmt(r.toNumber(), 4)}`;
}

/** "3 out of 8", "3/8", "0.375", "37.5%" → an exact probability where possible. */
function readProbability(token: string): Rational | null {
  try {
    const t = token.trim();
    let m = t.match(/^([+-]?\d+)\s*(?:\/|out\s+of)\s*(\d+)$/i);
    if (m) return new Rational(Number(m[1]), Number(m[2]));
    m = t.match(/^([+-]?(?:\d*\.?\d+))\s*%$/);
    if (m) return Rational.parse(m[1]).div(Rational.int(100));
    m = t.match(/^([+-]?(?:\d*\.?\d+))$/);
    if (m) return Rational.parse(m[1]);
    return null;
  } catch {
    return null;
  }
}

function valid(p: Rational): boolean {
  return p.toNumber() >= 0 && p.toNumber() <= 1;
}

export const probabilitySolver: Solver = {
  id: 'probability',
  title: 'Probability',
  subjects: ['Methods', 'General'],
  blurb: 'Single events, complements, unions and conditional probability.',
  placeholder: 'e.g.  3 out of 8   or   P(A)=0.4, P(B)=0.3 independent union',
  methods: [
    {
      id: 'single',
      name: 'Single event',
      blurb: 'Favourable outcomes over total outcomes, plus the complement.',
      opForm: 'probability',
    },
    {
      id: 'union',
      name: 'Union (or)',
      blurb: 'P(A∪B) = P(A) + P(B) − P(A∩B) — the addition rule.',
      opForm: 'probability',
    },
    {
      id: 'intersection',
      name: 'Intersection (and)',
      blurb: 'P(A∩B) = P(A)×P(B) for independent events.',
      opForm: 'probability',
    },
    {
      id: 'conditional',
      name: 'Conditional',
      blurb:
        'P(A|B) = P(A∩B) / P(B) — probability given something already happened.',
      opForm: 'probability',
    },
  ],
  defaultMethodId: 'single',
  detect(input) {
    const l = input.toLowerCase();
    const p = parseParams(input);
    const hasPA = /p\s*\(\s*a\s*\)/i.test(input) || p.pa !== undefined;
    const hasPB = /p\s*\(\s*b\s*\)/i.test(input) || p.pb !== undefined;
    if (hasPA && hasPB) return 0.95;
    if (/\bout\s+of\b/.test(l) && /probability|chance|likelihood/.test(l))
      return 0.92;
    if (/\bout\s+of\b/.test(l)) return 0.55;
    if (
      /probability|complement|conditional|independent/.test(l) &&
      readProbability(l.replace(/[^0-9./%]/g, ' ').trim())
    ) {
      return 0.6;
    }
    return 0;
  },
  solve(input, methodId): SolveResult {
    const l = input.toLowerCase();

    // Two named events → the combination rules.
    const pa = readNamed(input, 'a');
    const pb = readNamed(input, 'b');
    const pab = readNamed(input, 'a\\s*(?:∩|and|&)\\s*b');
    const independent = /\bindependent\b/.test(l);
    const mutuallyExclusive = /mutually\s+exclusive|\bdisjoint\b/.test(l);

    if (pa && pb) {
      if (!valid(pa) || !valid(pb) || (pab !== null && !valid(pab))) {
        return { ok: false, error: 'A probability has to be between 0 and 1.' };
      }
      if (pab !== null) {
        const lower = Math.max(0, pa.toNumber() + pb.toNumber() - 1);
        const upper = Math.min(pa.toNumber(), pb.toNumber());
        const overlap = pab.toNumber();
        if (overlap < lower - 1e-12 || overlap > upper + 1e-12) {
          return {
            ok: false,
            error:
              'P(A∩B) is inconsistent with P(A) and P(B). The overlap must lie between their probability bounds.',
          };
        }
      }
      const product = pa.mul(pb);
      if (independent && mutuallyExclusive && !product.isZero()) {
        return {
          ok: false,
          error:
            'Non-zero events cannot be both independent and mutually exclusive.',
        };
      }
      if (pab !== null && independent && !pab.eq(product)) {
        return {
          ok: false,
          error:
            'The supplied overlap does not equal P(A)×P(B), so these values are not independent.',
        };
      }
      if (pab !== null && mutuallyExclusive && !pab.isZero()) {
        return {
          ok: false,
          error: 'Mutually exclusive events must have P(A∩B)=0.',
        };
      }
      const asked = /union|\bor\b|∪/.test(l)
        ? 'union'
        : /conditional|given|\||∣/.test(l)
          ? 'conditional'
          : /intersect|\band\b|∩/.test(l)
            ? 'intersection'
            : methodId;
      const joint =
        pab ??
        (independent ? product : mutuallyExclusive ? Rational.int(0) : null);

      if (joint === null) {
        return {
          ok: false,
          error:
            'Give P(A∩B), or state that the events are independent or mutually exclusive.',
        };
      }

      if (asked === 'union') {
        const un = pa.add(pb).sub(joint);
        const steps: Step[] = [
          {
            note: 'The addition rule stops the overlap being counted twice.',
            latex: `P(A \\cup B) = P(A) + P(B) - P(A \\cap B)`,
          },
        ];
        if (pab === null && independent) {
          steps.push({
            note: 'The events are stated to be independent, so multiply to find the overlap.',
            latex: `P(A \\cap B) = P(A) \\times P(B) = ${rl(pa)} \\times ${rl(pb)} = ${rl(joint)}`,
            annotation: 'independent events',
          });
        } else if (pab === null && mutuallyExclusive) {
          steps.push({
            note: 'Mutually exclusive events have no overlap.',
            latex: 'P(A \\cap B) = 0',
            annotation: 'mutually exclusive',
          });
        }
        steps.push({
          note: 'Substitute the probabilities.',
          latex: `P(A \\cup B) = ${rl(pa)} + ${rl(pb)} - ${rl(joint)}`,
        });
        steps.push({
          note: 'Work it out.',
          latex: `P(A \\cup B) = ${asFractionAndDecimal(un)}`,
          annotation: 'answer',
        });
        return done('Find $P(A \\cup B)$', 'Addition rule', steps, rl(un));
      }

      if (asked === 'conditional') {
        if (pb.isZero())
          return { ok: false, error: 'P(B) is zero, so P(A|B) is undefined.' };
        const cond = joint.div(pb);
        const relationshipSteps: Step[] = [];
        if (pab === null && independent) {
          relationshipSteps.push({
            note: 'The events are independent, so find the overlap by multiplying.',
            latex: `P(A \\cap B) = ${rl(pa)} \\times ${rl(pb)} = ${rl(joint)}`,
            annotation: 'independent events',
          });
        } else if (pab === null && mutuallyExclusive) {
          relationshipSteps.push({
            note: 'Mutually exclusive events have no overlap.',
            latex: 'P(A \\cap B) = 0',
            annotation: 'mutually exclusive',
          });
        }
        const steps: Step[] = [
          {
            note: 'Conditional probability narrows the sample space to B.',
            latex: `P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)}`,
          },
          ...relationshipSteps,
          {
            note: 'Substitute.',
            latex: `P(A \\mid B) = \\dfrac{${rl(joint)}}{${rl(pb)}}`,
          },
          {
            note: 'Work it out.',
            latex: `P(A \\mid B) = ${asFractionAndDecimal(cond)}`,
            annotation: 'answer',
          },
        ];
        if (cond.eq(pa)) {
          steps.push({
            note: 'This equals $P(A)$, so knowing B happened tells us nothing about A.',
            latex: `P(A \\mid B) = P(A) \\Rightarrow \\text{independent}`,
            annotation: 'independent events',
          });
        }
        return done(
          'Find $P(A \\mid B)$',
          'Conditional probability',
          steps,
          rl(cond),
        );
      }

      const steps: Step[] = [
        {
          note:
            pab !== null
              ? 'Use the supplied overlap.'
              : independent
                ? 'For independent events, multiply the probabilities.'
                : 'Mutually exclusive events have no overlap.',
          latex:
            pab !== null
              ? `P(A \\cap B) = ${rl(joint)}`
              : independent
                ? 'P(A \\cap B) = P(A) \\times P(B)'
                : 'P(A \\cap B) = 0',
        },
        ...(independent
          ? [
              {
                note: 'Substitute.',
                latex: `P(A \\cap B) = ${rl(pa)} \\times ${rl(pb)}`,
              },
            ]
          : []),
        {
          note: 'Work it out.',
          latex: `P(A \\cap B) = ${asFractionAndDecimal(joint)}`,
          annotation: 'answer',
        },
      ];
      return done(
        'Find $P(A \\cap B)$',
        'Multiplication rule',
        steps,
        rl(joint),
      );
    }

    // Single event: "3 out of 8"
    const m = input.match(/(-?\d+)\s*(?:\/|out\s+of)\s*(\d+)/i);
    if (m) {
      const fav = Number(m[1]);
      const total = Number(m[2]);
      if (total === 0)
        return {
          ok: false,
          error: 'The total number of outcomes can’t be zero.',
        };
      if (fav < 0)
        return {
          ok: false,
          error: 'The number of favourable outcomes cannot be negative.',
        };
      if (fav > total)
        return {
          ok: false,
          error:
            'There can’t be more favourable outcomes than possible outcomes.',
        };
      if (!Number.isSafeInteger(fav) || !Number.isSafeInteger(total))
        return {
          ok: false,
          error: 'Outcome counts must be whole numbers in the supported range.',
        };
      const p = new Rational(fav, total);
      const q = Rational.int(1).sub(p);
      const steps: Step[] = [
        {
          note: 'Probability is favourable outcomes over total outcomes.',
          latex: `P(E) = \\dfrac{\\text{favourable}}{\\text{total}}`,
        },
        {
          note: 'Substitute the counts.',
          latex: `P(E) = \\dfrac{${fav}}{${total}}`,
        },
        {
          note: 'Simplify.',
          latex: `P(E) = ${asFractionAndDecimal(p)}`,
          annotation: 'probability',
        },
        {
          note: 'The complement is everything else — it must total 1.',
          latex: `P(E') = 1 - ${rl(p)} = ${asFractionAndDecimal(q)}`,
          annotation: 'complement',
        },
        {
          note: 'As a percentage.',
          latex: `P(E) = ${fmt(p.toNumber() * 100, 2)}\\%`,
        },
      ];
      return done(
        `Find the probability of ${fav} out of ${total}`,
        'Single event',
        steps,
        rl(p),
      );
    }

    return {
      ok: false,
      error:
        'Try 3 out of 8, or give two events with their overlap or relationship.',
    };
  },
};

/** Read `P(A)=0.4`, `P(A) = 2/5`, or `pa=0.4`. */
function readNamed(input: string, name: string): Rational | null {
  const token =
    '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:\\s*(?:\\/|out\\s+of)\\s*\\d+|\\s*%)?';
  const re = new RegExp(`P\\s*\\(\\s*${name}\\s*\\)\\s*=\\s*(${token})`, 'i');
  const m = input.match(re);
  if (m) return readProbability(m[1]);
  const short = input.match(
    new RegExp(`\\bp${name.replace(/[^a-z]/gi, '')}\\s*=\\s*(${token})`, 'i'),
  );
  return short ? readProbability(short[1]) : null;
}

function done(
  headline: string,
  methodName: string,
  steps: Step[],
  answerLatex: string,
): SolveResult {
  return { ok: true, solution: { headline, methodName, steps, answerLatex } };
}
