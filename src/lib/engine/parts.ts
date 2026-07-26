import { normalise } from '../nl/normalise';
import { foldArithmetic } from '../nl/arithmetic';
import { detectSolver } from './registry';
import type { Solver, SolveResult } from './types';

/**
 * Splitting one question into the several topics it actually spans.
 *
 * School questions rarely respect topic boundaries: "solve x² + 5x + 6 = 0
 * then differentiate it" is an algebra question and a calculus question, and
 * "3x + 4 = 2x − 5 and then find 20% of the answer" needs the second part to
 * know what the first one worked out.
 *
 * Two rules keep this honest:
 *
 * 1. **A split has to prove itself.** A candidate split is accepted only when
 *    every piece independently detects a topic *and* solves. That is what
 *    stops "a triangle with sides 5, 6 and 7" being torn in half at the "and"
 *    — "sides 5, 6" does not solve on its own, so the split is rejected and
 *    the question stays whole.
 *
 * 2. **The strength of the separator decides the order of attack.** A
 *    semicolon or "then" is an explicit "now do something else", so splitting
 *    is tried first. A bare "and" is usually just English, so the question is
 *    tried whole first and only split if that fails.
 */

/** One sub-problem of a question, worked in its own topic. */
export interface WorkedPart {
  /** "a", "b", "c" — only shown when there is more than one. */
  label: string;
  /** The sub-question, after any reference to an earlier part was resolved. */
  text: string;
  solver: Solver;
  methodId: string;
  result: SolveResult;
  /** Set when this part had to borrow an earlier answer, for display. */
  carried?: string;
}

export interface Worked {
  parts: WorkedPart[];
  /** True when the question genuinely spanned more than one topic. */
  split: boolean;
}

/**
 * Separators, strongest first. "then" and ";" state outright that another
 * task follows; "and" only might.
 */
const STRONG = /\s*(?:;|\bthen\b|\bafter\s+that\b|\bnext\b)\s*/i;
const WEAK = /\s+and\s+/i;

/**
 * Ways a student points back at the previous part, in decreasing precision.
 * "The larger root" names one of several values, "the answer" names the value,
 * and "it" could mean either the value or the thing the question was about.
 */
const REF_PICK =
  /\bthe\s+(larger|largest|bigger|biggest|smaller|smallest|positive|negative|first|second|other)\s+(?:root|solution|answer|value|one)\b/i;
const REF_ANSWER = /\b(?:the\s+answer|the\s+result|that\s+answer)\b/i;
const REF_VAGUE = /\b(?:it|that|this|the\s+same)\b/i;
const REFERENCE = new RegExp(
  `${REF_PICK.source}|${REF_ANSWER.source}|${REF_VAGUE.source}`,
  'i',
);

/** Every number an answer states, in the order written. */
function answerValues(latex: string | undefined): number[] {
  if (!latex) return [];
  const cleaned = latex.replace(/\\d?frac\s*\{(-?[\d.]+)\}\s*\{(-?[\d.]+)\}/g, (_, a, b) =>
    String(Number(a) / Number(b)),
  );
  return (cleaned.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** Resolve "the larger root" against the values an answer offers. */
function pickValue(qualifier: string, values: number[]): string | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  switch (qualifier.toLowerCase()) {
    case 'larger':
    case 'largest':
    case 'bigger':
    case 'biggest':
      return String(sorted[sorted.length - 1]);
    case 'smaller':
    case 'smallest':
      return String(sorted[0]);
    case 'positive':
      return values.find((v) => v > 0)?.toString() ?? null;
    case 'negative':
      return values.find((v) => v < 0)?.toString() ?? null;
    case 'first':
      return String(values[0]);
    case 'second':
    case 'other':
      return values.length > 1 ? String(values[1]) : null;
    default:
      return null;
  }
}

/** Split on the first separator that yields exactly two non-empty sides. */
function cut(text: string, re: RegExp): [string, string] | null {
  const m = re.exec(text);
  if (!m) return null;
  const left = text.slice(0, m.index).trim();
  const right = text.slice(m.index + m[0].length).trim();
  if (left === '' || right === '') return null;
  return [left, right];
}

/**
 * Solve one fragment on its own terms; null when nothing claims it.
 *
 * When nobody chose the method, the default is only a starting guess. Asking
 * to factorise x² + 6x + 2 correctly reports that it does not factorise, which
 * is the right answer to the wrong question — the student never picked
 * factorising. So if the default method reaches no answer, try the others and
 * use the first that does.
 */
function solveFragment(
  text: string,
  solveOne: (solver: Solver, text: string, methodId: string) => SolveResult,
): { solver: Solver; methodId: string; result: SolveResult } | null {
  // Read it as written first. Only if that gets nowhere is the arithmetic
  // inside it worked out — "ln x = 5^2" becomes "ln x = 25" — so a question
  // that already made sense can never be altered underneath the student.
  const readings = [text];
  const folded = foldArithmetic(text);
  if (folded !== text) readings.push(folded);

  let fallback: { solver: Solver; methodId: string; result: SolveResult } | null = null;
  for (const reading of readings) {
    const got = attempt(reading, solveOne);
    if (got?.result.ok && got.result.solution.answerLatex) return got;
    fallback ??= got;
  }
  return fallback;
}

/** One reading, trying each method until one reaches an answer. */
function attempt(
  text: string,
  solveOne: (solver: Solver, text: string, methodId: string) => SolveResult,
): { solver: Solver; methodId: string; result: SolveResult } | null {
  const detection = detectSolver(normalise(text).text) ?? detectSolver(text);
  if (!detection) return null;
  const solver = detection.solver;

  const first = solveOne(solver, text, solver.defaultMethodId);
  if (first.ok && first.solution.answerLatex) {
    return { solver, methodId: solver.defaultMethodId, result: first };
  }
  for (const method of solver.methods) {
    if (method.id === solver.defaultMethodId) continue;
    const alt = solveOne(solver, text, method.id);
    if (alt.ok && alt.solution.answerLatex) return { solver, methodId: method.id, result: alt };
  }
  return { solver, methodId: solver.defaultMethodId, result: first };
}

/**
 * Strip LaTeX down to the bare value, so "x = -9" can be dropped into a
 * following part as "-9" and "f'(x) = 3x^{2}" as "3x^2".
 *
 * Returns null unless the answer is a *single* quantity. "x = −2 or x = −3"
 * must not silently collapse to −3: a part that says "and then halve it" has
 * no single thing to halve, and picking one root at random would be a wrong
 * answer presented as a right one.
 */
export function plainAnswer(latex: string | undefined): string | null {
  if (!latex) return null;
  // Two answers joined by "or", or a comma-separated summary, is not one value.
  if (/\\quad|\\text\{\s*or|,/.test(latex)) return null;

  const s = latex
    .replace(/\\left|\\right/g, '')
    .replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/\\text\{[^{}]*\}/g, '')
    .replace(/\^\s*\{([^{}]+)\}/g, '^$1') // x^{2} → x^2, which the parsers read
    .replace(/[$\\{}]/g, '')
    .trim();

  // "x = -9" and "f'(x) = 3x^2" both carry their value to the right of the
  // last "=". More than one "=" means it is a chain, not a single value.
  const parts = s.split('=');
  const value = parts[parts.length - 1].trim();
  return value === '' ? null : value;
}

/**
 * Verbs that act on a *function*, where "it" means the expression from the
 * previous part rather than the number that part arrived at. "Differentiate
 * it" after solving x² + 5x + 6 = 0 means differentiate x² + 5x + 6, not
 * differentiate −3.
 */
const ACTS_ON_FUNCTION =
  /\b(?:differentiate|integrate|d\/dx|sketch|graph|factorise|factorize|expand|simplify|solve|antiderivative|∫)\b/i;

/**
 * What an earlier part was *about*, as opposed to what it answered — the
 * expression in "solve x² + 5x + 6 = 0", so that "differentiate it" has
 * something to differentiate.
 */
export function subjectOf(text: string): string | null {
  // Normalise first so command words ("solve", "find") are already gone —
  // otherwise the subject of "solve x² + 5x + 6 = 0" comes back carrying the
  // word "solve", which the next part's parser would rightly refuse.
  const body = normalise(text)
    .text.split('=')[0]
    .replace(/\b(?:differentiate|integrate|sketch|graph|expand|factorise|factorize|simplify)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return body === '' ? null : body;
}

/**
 * Resolve a back-reference in `text` using the previous part. Returns every
 * reading worth trying, best first — the solver decides which one works,
 * rather than this guessing from the wording.
 */
function readings(text: string, prev: WorkedPart): string[] {
  // "…and find the stationary points" names no function of its own, so the
  // only thing it can be about is what the previous part was about. There is
  // no pronoun to go on here — the absence of any maths is the signal.
  if (!REFERENCE.test(text) && !/\d|\bx\b/i.test(text)) {
    const subject = subjectOf(prev.text);
    return subject ? [`${text} ${subject}`, text] : [text];
  }
  if (!REFERENCE.test(text)) return [text];
  const latex = prev.result.ok ? prev.result.solution.answerLatex : undefined;
  const answer = plainAnswer(latex);
  const subject = subjectOf(prev.text);

  // "The larger root" names one specific value out of several, so it beats
  // every other reading — including the single-value guard, which refuses a
  // two-root answer precisely because it cannot choose between them.
  const pick = REF_PICK.exec(text);
  if (pick) {
    const chosen = pickValue(pick[1], answerValues(latex));
    if (chosen) return [text.replace(REF_PICK, ` ${chosen} `).replace(/\s+/g, ' ').trim(), text];
  }

  // "Integrate the answer" means the answer even though "integrate" acts on a
  // function; only a vague "it" leaves room for the verb to decide.
  const candidates = REF_ANSWER.test(text)
    ? [answer, subject]
    : ACTS_ON_FUNCTION.test(text)
      ? [subject, answer]
      : [answer, subject];

  const out: string[] = [];
  for (const value of candidates) {
    if (!value) continue;
    out.push(text.replace(REFERENCE, ` ${value} `).replace(/\s+/g, ' ').trim());
  }
  // Falling back to the text as written matters when "it" was incidental.
  out.push(text);
  return out;
}

/** Try to work `text` as two or more parts. Returns null when it is one problem. */
function trySplit(
  text: string,
  re: RegExp,
  solveOne: (solver: Solver, text: string, methodId: string) => SolveResult,
  depth: number,
): WorkedPart[] | null {
  const halves = cut(text, re);
  if (!halves) return null;
  const [leftText, rightText] = halves;

  const left = solveFragment(leftText, solveOne);
  if (!left || !left.result.ok) return null;

  const first: WorkedPart = { label: 'a', text: leftText, ...left };

  // The tail may itself be several parts ("solve … then differentiate … then
  // integrate …"), so recurse before treating it as a single piece.
  const deeper = depth > 0 ? trySplit(rightText, re, solveOne, depth - 1) : null;
  const tails = deeper ?? [];
  if (tails.length > 0) {
    // Each tail part still has to resolve references against what precedes it.
    return relabel([first, ...tails]);
  }

  for (const reading of readings(rightText, first)) {
    const right = solveFragment(reading, solveOne);
    if (right && right.result.ok) {
      return relabel([
        first,
        {
          label: 'b',
          text: reading,
          ...right,
          carried: reading === rightText ? undefined : rightText,
        },
      ]);
    }
  }
  return null;
}

function relabel(parts: WorkedPart[]): WorkedPart[] {
  return parts.map((p, i) => ({ ...p, label: String.fromCharCode(97 + i) }));
}

/**
 * Work a question, splitting it across topics when it spans more than one.
 *
 * `solveOne` is injected so this module stays independent of how a single
 * problem is run (and so tests can drive it directly).
 */
export function work(
  raw: string,
  solveOne: (solver: Solver, text: string, methodId: string) => SolveResult,
  preferred?: { solver: Solver; methodId: string },
): Worked {
  const whole = (): Worked | null => {
    if (preferred) {
      for (const reading of [raw, foldArithmetic(raw)]) {
        const result = solveOne(preferred.solver, reading, preferred.methodId);
        if (result.ok) {
          return { parts: [{ label: 'a', text: reading, ...preferred, result }], split: false };
        }
      }
      return null;
    }
    const chosen = solveFragment(raw, solveOne);
    if (!chosen || !chosen.result.ok) return null;
    return { parts: [{ label: 'a', text: raw, ...chosen }], split: false };
  };

  const strong = () => trySplit(raw, STRONG, solveOne, 3);
  const weak = () => trySplit(raw, WEAK, solveOne, 3);

  // An explicit separator outranks solving the question whole; a bare "and"
  // does not. When the student picked the topic themselves, respect that and
  // do not go looking for a second topic.
  const order = preferred
    ? [whole]
    : STRONG.test(raw)
      ? [() => wrap(strong()), whole, () => wrap(weak())]
      : [whole, () => wrap(weak())];

  for (const attempt of order) {
    const got = attempt();
    if (got) return got;
  }

  // Nothing worked. Report the whole-question failure rather than a split that
  // half-succeeded — the error from the question as asked is the useful one.
  const fallback = preferred ?? solveFragment(raw, solveOne);
  if (!fallback) return { parts: [], split: false };
  return {
    parts: [
      {
        label: 'a',
        text: raw,
        solver: fallback.solver,
        methodId: fallback.methodId,
        result: solveOne(fallback.solver, raw, fallback.methodId),
      },
    ],
    split: false,
  };
}

function wrap(parts: WorkedPart[] | null): Worked | null {
  return parts && parts.length > 1 ? { parts, split: true } : null;
}
