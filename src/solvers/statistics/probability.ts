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
  const t = token.trim();
  let m = t.match(/^(-?\d+)\s*(?:\/|out\s+of)\s*(\d+)$/i);
  if (m) return new Rational(Number(m[1]), Number(m[2]));
  m = t.match(/^(\d*\.?\d+)\s*%$/);
  if (m) return Rational.parse(String(Number(m[1]) / 100));
  m = t.match(/^(\d*\.?\d+)$/);
  if (m) return Rational.parse(m[1]);
  return null;
}

function valid(p: Rational): boolean {
  return p.toNumber() >= 0 && p.toNumber() <= 1;
}

export const probabilitySolver: Solver = {
  id: 'probability',
  title: 'Probability',
  subjects: ['Methods', 'General'],
  blurb: 'Single events, complements, unions and conditional probability.',
  placeholder: 'e.g.  3 out of 8   or   P(A)=0.4, P(B)=0.3 union',
  methods: [
    { id: 'single', name: 'Single event', blurb: 'Favourable outcomes over total outcomes, plus the complement.' },
    { id: 'union', name: 'Union (or)', blurb: 'P(A∪B) = P(A) + P(B) − P(A∩B) — the addition rule.' },
    { id: 'intersection', name: 'Intersection (and)', blurb: 'P(A∩B) = P(A)×P(B) for independent events.' },
    { id: 'conditional', name: 'Conditional', blurb: 'P(A|B) = P(A∩B) / P(B) — probability given something already happened.' },
  ],
  defaultMethodId: 'single',
  detect(input) {
    const l = input.toLowerCase();
    const p = parseParams(input);
    const hasPA = /p\s*\(\s*a\s*\)/i.test(input) || p.pa !== undefined;
    const hasPB = /p\s*\(\s*b\s*\)/i.test(input) || p.pb !== undefined;
    if (hasPA && hasPB) return 0.95;
    if (/\bout\s+of\b/.test(l) && /probability|chance|likelihood/.test(l)) return 0.92;
    if (/\bout\s+of\b/.test(l)) return 0.55;
    if (/probability|complement|conditional|independent/.test(l) && readProbability(l.replace(/[^0-9./%]/g, ' ').trim())) {
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

    if (pa && pb) {
      if (!valid(pa) || !valid(pb)) {
        return { ok: false, error: 'A probability has to be between 0 and 1.' };
      }
      const asked =
        /union|\bor\b|∪/.test(l) ? 'union'
        : /conditional|given|\||∣/.test(l) ? 'conditional'
        : /intersect|\band\b|∩/.test(l) ? 'intersection'
        : methodId;

      if (asked === 'union') {
        const joint = pab ?? pa.mul(pb);
        const un = pa.add(pb).sub(joint);
        const steps: Step[] = [
          { note: 'The addition rule stops the overlap being counted twice.', latex: `P(A \\cup B) = P(A) + P(B) - P(A \\cap B)` },
        ];
        if (!pab) {
          steps.push({
            note: 'No overlap was given, so treat the events as independent.',
            latex: `P(A \\cap B) = P(A) \\times P(B) = ${rl(pa)} \\times ${rl(pb)} = ${rl(joint)}`,
            annotation: 'assuming independence',
          });
        }
        steps.push({ note: 'Substitute the probabilities.', latex: `P(A \\cup B) = ${rl(pa)} + ${rl(pb)} - ${rl(joint)}` });
        steps.push({ note: 'Work it out.', latex: `P(A \\cup B) = ${asFractionAndDecimal(un)}`, annotation: 'answer' });
        return done('Find $P(A \\cup B)$', 'Addition rule', steps, rl(un));
      }

      if (asked === 'conditional') {
        const joint = pab ?? pa.mul(pb);
        if (pb.isZero()) return { ok: false, error: 'P(B) is zero, so P(A|B) is undefined.' };
        const cond = joint.div(pb);
        const steps: Step[] = [
          { note: 'Conditional probability narrows the sample space to B.', latex: `P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)}` },
          { note: 'Substitute.', latex: `P(A \\mid B) = \\dfrac{${rl(joint)}}{${rl(pb)}}` },
          { note: 'Work it out.', latex: `P(A \\mid B) = ${asFractionAndDecimal(cond)}`, annotation: 'answer' },
        ];
        if (cond.eq(pa)) {
          steps.push({
            note: 'This equals $P(A)$, so knowing B happened tells us nothing about A.',
            latex: `P(A \\mid B) = P(A) \\Rightarrow \\text{independent}`,
            annotation: 'independent events',
          });
        }
        return done('Find $P(A \\mid B)$', 'Conditional probability', steps, rl(cond));
      }

      const joint = pa.mul(pb);
      const steps: Step[] = [
        { note: 'For independent events, multiply the probabilities.', latex: `P(A \\cap B) = P(A) \\times P(B)` },
        { note: 'Substitute.', latex: `P(A \\cap B) = ${rl(pa)} \\times ${rl(pb)}` },
        { note: 'Work it out.', latex: `P(A \\cap B) = ${asFractionAndDecimal(joint)}`, annotation: 'answer' },
      ];
      return done('Find $P(A \\cap B)$', 'Multiplication rule', steps, rl(joint));
    }

    // Single event: "3 out of 8"
    const m = input.match(/(-?\d+)\s*(?:\/|out\s+of)\s*(\d+)/i);
    if (m) {
      const fav = Number(m[1]);
      const total = Number(m[2]);
      if (total === 0) return { ok: false, error: 'The total number of outcomes can’t be zero.' };
      if (fav > total) return { ok: false, error: 'There can’t be more favourable outcomes than possible outcomes.' };
      const p = new Rational(fav, total);
      const q = Rational.int(1).sub(p);
      const steps: Step[] = [
        { note: 'Probability is favourable outcomes over total outcomes.', latex: `P(E) = \\dfrac{\\text{favourable}}{\\text{total}}` },
        { note: 'Substitute the counts.', latex: `P(E) = \\dfrac{${fav}}{${total}}` },
        { note: 'Simplify.', latex: `P(E) = ${asFractionAndDecimal(p)}`, annotation: 'probability' },
        {
          note: 'The complement is everything else — it must total 1.',
          latex: `P(E') = 1 - ${rl(p)} = ${asFractionAndDecimal(q)}`,
          annotation: 'complement',
        },
        { note: 'As a percentage.', latex: `P(E) = ${fmt(p.toNumber() * 100, 2)}\\%` },
      ];
      return done(`Find the probability of ${fav} out of ${total}`, 'Single event', steps, rl(p));
    }

    return {
      ok: false,
      error: 'Try  3 out of 8,  or give two events like  P(A)=0.4, P(B)=0.3 union.',
    };
  },
};

/** Read `P(A)=0.4`, `P(A) = 2/5`, or `pa=0.4`. */
function readNamed(input: string, name: string): Rational | null {
  const re = new RegExp(`P\\s*\\(\\s*${name}\\s*\\)\\s*=\\s*([0-9./%]+(?:\\s*out\\s+of\\s*\\d+)?)`, 'i');
  const m = input.match(re);
  if (m) return readProbability(m[1]);
  const short = input.match(new RegExp(`\\bp${name.replace(/[^a-z]/gi, '')}\\s*=\\s*([0-9./%]+)`, 'i'));
  return short ? readProbability(short[1]) : null;
}

function done(headline: string, methodName: string, steps: Step[], answerLatex: string): SolveResult {
  return { ok: true, solution: { headline, methodName, steps, answerLatex } };
}
