import { fmt, gcd, rad2deg } from '../../lib/math/num';
import { parseExpr, simplify, toLatex, evaluateExpr, num, type Expr } from '../../lib/math/expr';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Solving by undoing, one layer at a time.
 *
 * Every other solver here recognises a *shape*: `ln x = c`, `ax + b = c`,
 * `b^x = c`. That works right up until a question wraps one topic inside
 * another. `ln(x + 5) = 5` is a logarithm around a linear expression, and
 * matching on shape means neither the log solver nor the linear solver will
 * touch it. Nineteen of twenty perfectly ordinary school equations fell
 * through that gap — including `2(x + 3) = 10` and `x/4 + 2 = 7`.
 *
 * The way out is to stop matching shapes. When the unknown appears exactly
 * once, everything around it is a stack of operations applied to x, and the
 * equation is solved by undoing them from the outside in — which is precisely
 * how balancing is taught. Brackets, fractions, powers, roots, logs and
 * exponentials all become the same move, so they combine freely and no
 * particular combination has to be anticipated.
 *
 * "Exactly once" is what keeps this exact rather than a guess: each layer has
 * one inverse, so there is nothing to search for and nothing to rearrange.
 * Anything with x on both sides is left to the solvers that collect terms.
 */

const X = 'x';

/* ------------------------------------------------------------ reading it in */

function occurrences(e: Expr): number {
  switch (e.t) {
    case 'num':
      return 0;
    case 'var':
      return e.name === X ? 1 : 0;
    case 'neg':
    case 'fn':
      return occurrences(e.a);
    default:
      return occurrences(e.a) + occurrences(e.b);
  }
}

const has = (e: Expr): boolean => occurrences(e) > 0;

/** Every symbol in the expression, so a stray letter can't evaluate to NaN. */
function symbols(e: Expr, into = new Set<string>()): Set<string> {
  if (e.t === 'var') into.add(e.name);
  else if (e.t === 'num') void 0;
  else if (e.t === 'neg' || e.t === 'fn') symbols(e.a, into);
  else {
    symbols(e.a, into);
    symbols(e.b, into);
  }
  return into;
}

interface Equation {
  left: Expr; // the side holding x
  right: Expr; // the side that doesn't
}

/**
 * Read `A = B` into an equation with x on the left, or null when this solver
 * has no business with it. Refusing here is the point: a null means some other
 * solver keeps the question, rather than this one answering it badly.
 */
function readEquation(raw: string): Equation | null {
  const text = raw.trim();
  if (/[;\n]/.test(text)) return null; // two equations at once → simultaneous
  const sides = text.split('=');
  if (sides.length !== 2 || !sides[0].trim() || !sides[1].trim()) return null;

  let left: Expr;
  let right: Expr;
  try {
    left = parseExpr(sides[0]);
    right = parseExpr(sides[1]);
  } catch {
    return null;
  }

  // A letter with no value would evaluate to NaN and print as one. `e` is the
  // only symbol besides x that stands for a number.
  for (const name of symbols(left, symbols(right))) {
    if (name !== X && name !== 'e') return null;
  }

  const total = occurrences(left) + occurrences(right);
  if (total !== 1) return null; // x twice → collecting terms, not undoing
  return has(left) ? { left, right } : { left: right, right: left };
}

/* -------------------------------------------------------------- presentation */

/** Bracket a sum before something is done to the whole of it. */
function tight(e: Expr): string {
  const s = toLatex(e);
  return e.t === 'add' || e.t === 'sub' || e.t === 'neg' ? `\\left(${s}\\right)` : s;
}

/** A rational answer is worth showing as a fraction as well as a decimal. */
function asFraction(e: Expr): string | null {
  if (e.t !== 'div' || e.a.t !== 'num' || e.b.t !== 'num') return null;
  const [p, q] = [e.a.v, e.b.v];
  if (!Number.isInteger(p) || !Number.isInteger(q) || q === 0) return null;
  const g = gcd(Math.abs(p), Math.abs(q));
  if (g === 1 && q > 0) return null; // already in lowest terms
  const [n, d] = q < 0 ? [-p / g, -q / g] : [p / g, q / g];
  return d === 1 ? String(n) : `\\dfrac{${n}}{${d}}`;
}

interface Answer {
  latex: string; // the whole line, e.g.  x = 15^{\circ}
  value: number;
}

/**
 * `proven` separates the two ways this can end without a value: a proof that
 * no real solution exists — which is itself a correct answer worth showing —
 * from this solver simply not being able to do it, which must refuse and let
 * something else try.
 */
type Outcome = { ok: true; answers: Answer[] } | { ok: false; why: string; proven: boolean };

const noSolution = (why: string): Outcome => ({ ok: false, why, proven: true });
const cannot = (why: string): Outcome => ({ ok: false, why, proven: false });

/* ------------------------------------------------------------- the peeling */

/**
 * Undo the operations wrapped around x, writing down each move as two lines:
 * the same operation applied to both sides, then the tidied result. Showing
 * only the tidied line hides the very thing balancing is about.
 */
function isolate(eq: Equation, steps: Step[], depth = 0): Outcome {
  let { left, right } = eq;

  for (let guard = 0; guard < 24; guard++) {
    if (left.t === 'var') return finish(right, steps);

    const tidy = (l: Expr, r: Expr, note: string, annotation?: string): void => {
      left = l;
      right = simplify(r);
      steps.push({ note, latex: `${toLatex(left)} = ${toLatex(right)}`, annotation });
    };

    switch (left.t) {
      /* ------------------------------------------------- + and − */
      case 'add':
      case 'sub': {
        const subtraction = left.t === 'sub';
        const keepIsFirst = has(left.a);
        const keep = keepIsFirst ? left.a : left.b;
        const other = keepIsFirst ? left.b : left.a;

        if (subtraction && !keepIsFirst) {
          // a − x = R. Taking a off both sides leaves −x, which the next turn
          // of the loop flips; doing it in one jump would skip the reason.
          steps.push({
            note: `Subtract $${toLatex(other)}$ from both sides, so the term with $x$ is on its own.`,
            latex: `${toLatex(left)} - ${tight(other)} = ${toLatex(right)} - ${tight(other)}`,
            annotation: 'same to both sides',
          });
          tidy({ t: 'neg', a: keep }, { t: 'sub', a: right, b: other }, `The $${toLatex(other)}$ on the left cancels.`);
          break;
        }

        // Adding a negative reads as subtracting, and the reverse.
        const value = evaluateExpr(other);
        const negative = Number.isFinite(value) && value < 0;
        const undo = subtraction && keepIsFirst ? 'add' : negative ? 'add' : 'subtract';
        const shown = negative ? simplify({ t: 'neg', a: other }) : other;
        const sign = undo === 'add' ? '+' : '-';

        steps.push({
          note: `${undo === 'add' ? 'Add' : 'Subtract'} $${toLatex(shown)}$ ${undo === 'add' ? 'to' : 'from'} both sides to undo the ${undo === 'add' ? 'subtraction' : 'addition'}.`,
          latex: `${toLatex(left)} ${sign} ${tight(shown)} = ${toLatex(right)} ${sign} ${tight(shown)}`,
          annotation: 'same to both sides',
        });
        tidy(
          keep,
          undo === 'add' ? { t: 'add', a: right, b: shown } : { t: 'sub', a: right, b: shown },
          `The $${toLatex(shown)}$ on the left cancels out.`,
        );
        break;
      }

      /* ------------------------------------------------- × and ÷ */
      case 'mul': {
        const keep = has(left.a) ? left.a : left.b;
        const factor = has(left.a) ? left.b : left.a;
        const value = evaluateExpr(factor);
        if (value === 0) return cannot('Multiplying by zero loses the $x$, so nothing can be recovered.');
        steps.push({
          note: `$${toLatex(keep)}$ is multiplied by $${toLatex(factor)}$, so divide both sides by $${toLatex(factor)}$ to undo it.`,
          latex: `\\dfrac{${toLatex(left)}}{${toLatex(factor)}} = \\dfrac{${toLatex(right)}}{${toLatex(factor)}}`,
          annotation: 'same to both sides',
        });
        tidy(keep, { t: 'div', a: right, b: factor }, `The $${toLatex(factor)}$ on the left cancels.`);
        break;
      }

      case 'div': {
        if (has(left.a)) {
          steps.push({
            note: `$${toLatex(left.a)}$ is divided by $${toLatex(left.b)}$, so multiply both sides by $${toLatex(left.b)}$.`,
            latex: `${toLatex(left)} \\times ${tight(left.b)} = ${toLatex(right)} \\times ${tight(left.b)}`,
            annotation: 'same to both sides',
          });
          tidy(left.a, { t: 'mul', a: right, b: left.b }, 'The division on the left cancels.');
          break;
        }
        // a / x = R: clear the denominator first, then divide by R.
        const top = left.a;
        const value = evaluateExpr(right);
        if (!Number.isFinite(value) || value === 0) {
          return evaluateExpr(left.a) === 0
            ? cannot('Both sides are zero whatever $x$ is, so nothing pins it down.')
            : noSolution('A fraction with a non-zero top can never equal zero, however big $x$ gets.');
        }
        steps.push({
          note: `$x$ is underneath, so multiply both sides by $${toLatex(left.b)}$ to bring it up.`,
          latex: `${toLatex(left)} \\times ${tight(left.b)} = ${toLatex(right)} \\times ${tight(left.b)}`,
          annotation: 'same to both sides',
        });
        steps.push({
          note: 'The fraction cancels, leaving the unknown as a factor.',
          latex: `${toLatex(top)} = ${toLatex(simplify({ t: 'mul', a: right, b: left.b }))}`,
        });
        steps.push({
          note: `Now divide both sides by $${toLatex(right)}$.`,
          latex: `\\dfrac{${toLatex(top)}}{${tight(right)}} = ${toLatex(left.b)}`,
          annotation: 'same to both sides',
        });
        tidy(left.b, { t: 'div', a: top, b: right }, 'Read it the other way round.');
        break;
      }

      case 'neg': {
        steps.push({
          note: 'The whole left-hand side is negative, so multiply both sides by $-1$.',
          latex: `${toLatex(left)} \\times (-1) = ${tight(right)} \\times (-1)`,
          annotation: 'same to both sides',
        });
        tidy(left.a, { t: 'neg', a: right }, 'Both signs flip.');
        break;
      }

      /* ---------------------------------------------------- powers */
      case 'pow': {
        if (has(left.a)) {
          const n = evaluateExpr(left.b);
          if (!Number.isFinite(n) || n === 0) return cannot('That index isn’t a number this can undo.');
          const step = undoPower(left.a, right, n, steps, depth);
          if ('done' in step) return step.done;
          left = step.next.left;
          right = step.next.right;
          break;
        }
        // c^u = R: the unknown is in the index, so logarithms bring it down.
        const base = evaluateExpr(left.a);
        if (!Number.isFinite(base) || base <= 0 || base === 1) {
          return cannot('A power like this only has a logarithm when its base is positive and not 1.');
        }
        const value = evaluateExpr(right);
        if (!(value > 0)) {
          return noSolution(
            `A positive base raised to any power is positive, so $${toLatex(left)}$ can never equal $${toLatex(right)}$.`,
          );
        }
        steps.push({
          note: `The unknown is in the index, so take $\\log_{${fmt(base)}}$ of both sides.`,
          latex: `\\log_{${fmt(base)}}\\left(${toLatex(left)}\\right) = \\log_{${fmt(base)}}\\left(${toLatex(right)}\\right)`,
          annotation: 'same to both sides',
        });
        const exact = wholePower(base, value);
        const asLog: Expr = { t: 'fn', name: 'log', a: right, base };
        steps.push({
          note: `A logarithm undoes a power of the same base, so the left-hand side is just the index.`,
          latex: `${toLatex(left.b)} = ${toLatex(asLog)}`,
          annotation: 'index comes down',
        });
        if (exact !== null) {
          steps.push({
            note: `$${fmt(base)}^{${exact}} = ${fmt(value)}$, so that logarithm is exactly ${exact}.`,
            latex: `${toLatex(left.b)} = ${exact}`,
            annotation: 'exact',
          });
        }
        left = left.b;
        right = exact !== null ? num(exact) : asLog;
        break;
      }

      /* -------------------------------------------------- functions */
      case 'fn': {
        const inner = left.a;
        switch (left.name) {
          case 'ln':
          case 'log': {
            const base = left.name === 'ln' ? Math.E : (left.base ?? 10);
            const shown = left.name === 'ln' ? 'e' : fmt(base);
            steps.push({
              note: `To undo a logarithm, raise $${shown}$ to the power of each side. Doing the same thing to both sides keeps the equation true.`,
              latex: `${shown}^{\\,${toLatex(left)}} = ${shown}^{\\,${toLatex(right)}}`,
              annotation: 'same to both sides',
            });
            const raised: Expr =
              left.name === 'ln' ? { t: 'fn', name: 'exp', a: right } : { t: 'pow', a: num(base), b: right };
            tidy(
              inner,
              raised,
              `Raising to a power and taking a logarithm of the same base undo each other, so the left-hand side is just $${toLatex(inner)}$.`,
              'index form',
            );
            break;
          }

          case 'exp':
          case 'sqrt': {
            if (left.name === 'exp') {
              const value = evaluateExpr(right);
              if (!(value > 0)) {
                return noSolution(`$e$ to any power is positive, so it can never equal $${toLatex(right)}$.`);
              }
              steps.push({
                note: 'To bring the index down, take the natural logarithm of both sides.',
                latex: `\\ln\\left(${toLatex(left)}\\right) = \\ln\\left(${toLatex(right)}\\right)`,
                annotation: 'same to both sides',
              });
              tidy(inner, { t: 'fn', name: 'ln', a: right }, '$\\ln$ and $e$ undo each other, leaving the index.');
              break;
            }
            const value = evaluateExpr(right);
            if (!(value >= 0)) {
              return noSolution(`A square root is never negative, so it can never equal $${toLatex(right)}$.`);
            }
            steps.push({
              note: 'Square both sides to undo the square root.',
              latex: `\\left(${toLatex(left)}\\right)^{2} = ${tight(right)}^{2}`,
              annotation: 'same to both sides',
            });
            tidy(inner, { t: 'pow', a: right, b: num(2) }, 'Squaring a square root leaves what was underneath.');
            break;
          }

          case 'sin':
          case 'cos':
          case 'tan':
            return solveTrig(left.name, inner, right, steps);

          default:
            return cannot(`There is no rule here for undoing $${toLatex(left)}$.`);
        }
        break;
      }

      default:
        return cannot('This one has a layer that can’t be undone by itself.');
    }
  }
  return cannot('This one has too many layers to unwrap.');
}

/**
 * Undoing a power either finishes the solve outright — an even root splits
 * into two cases, each solved to the end — or leaves a simpler equation to
 * carry on with.
 */
type PowerStep = { done: Outcome } | { next: Equation };

function undoPower(base: Expr, right: Expr, n: number, steps: Step[], depth: number): PowerStep {
  const value = evaluateExpr(right);
  const even = Number.isInteger(n) && n % 2 === 0;
  const root = n === 2 ? `\\sqrt{${toLatex(right)}}` : `\\sqrt[${fmt(n)}]{${toLatex(right)}}`;

  if (even && !(value >= 0)) {
    return {
      done: noSolution(`An even power is never negative, so it can never equal $${toLatex(right)}$.`),
    };
  }

  steps.push({
    note: `Take the ${ordinalRoot(n)} of both sides to undo the power.`,
    latex: `\\sqrt[${fmt(n)}]{${toLatex({ t: 'pow', a: base, b: num(n) })}} = ${root}`,
    annotation: 'same to both sides',
  });

  const size = Math.pow(Math.abs(value), 1 / n);
  const neat = Math.abs(size - Math.round(size)) < 1e-9 ? Math.round(size) : size;

  if (!even) {
    const signed = value < 0 ? -neat : neat;
    steps.push({
      note: 'An odd root keeps the sign, so there is one answer.',
      latex: `${toLatex(base)} = ${fmt(signed, 6)}`,
    });
    return { next: { left: base, right: num(signed) } };
  }

  // Zero is its own negative, so the two cases are the same one. Listing it
  // twice would present a repeated root as two distinct solutions.
  if (neat === 0) {
    steps.push({
      note: 'Zero has only one square root, so unlike the usual case there is a single answer here.',
      latex: `${toLatex(base)} = 0`,
      annotation: 'repeated root',
    });
    return { next: { left: base, right: num(0) } };
  }

  // An even root has two values, and dropping the negative one loses a real
  // solution — the single most common slip in this kind of question.
  steps.push({
    note: `An even power hides the sign: both $${fmt(neat, 6)}$ and $-${fmt(neat, 6)}$ give $${toLatex(right)}$ when raised to the power ${fmt(n)}. So there are two cases.`,
    latex: `${toLatex(base)} = \\pm ${fmt(neat, 6)}`,
    annotation: 'two cases',
  });

  if (depth > 2) return { done: cannot('This one branches too many times to lay out.') };

  const answers: Answer[] = [];
  for (const sign of [1, -1] as const) {
    const branch: Step[] = [];
    const outcome = isolate({ left: base, right: num(sign * neat) }, branch, depth + 1);
    if (!outcome.ok) return { done: outcome };
    steps.push({
      note: `Case ${sign === 1 ? 1 : 2}: take the ${sign === 1 ? 'positive' : 'negative'} root.`,
      latex: `${toLatex(base)} = ${fmt(sign * neat, 6)}`,
      annotation: `case ${sign === 1 ? 1 : 2}`,
    });
    steps.push(...branch);
    answers.push(...outcome.answers);
  }
  return { done: { ok: true, answers } };
}

function ordinalRoot(n: number): string {
  if (n === 2) return 'square root';
  if (n === 3) return 'cube root';
  return `${fmt(n)}th root`;
}

/** Is `value` a whole power of `base`? Then the logarithm is exact. */
function wholePower(base: number, value: number): number | null {
  const p = Math.log(value) / Math.log(base);
  const r = Math.round(p);
  return Math.abs(p - r) < 1e-10 && Math.abs(Math.pow(base, r) - value) < 1e-9 ? r : null;
}

/* --------------------------------------------------------- finishing off */

function finish(right: Expr, steps: Step[]): Outcome {
  const value = evaluateExpr(right);
  if (!Number.isFinite(value)) return cannot('The right-hand side didn’t come out as a number.');

  const fraction = asFraction(right);
  if (fraction) {
    steps.push({ note: 'Cancel the fraction down.', latex: `x = ${fraction}`, annotation: 'exact' });
  }
  const exact = fraction ?? toLatex(right);
  const decimal = fmt(value, 6);
  if (exact !== decimal) {
    steps.push({ note: 'Work it out.', latex: `x = ${decimal}`, annotation: 'solved' });
  } else if (steps.length) {
    steps[steps.length - 1].annotation = 'solved';
  }
  return { ok: true, answers: [{ latex: `x = ${decimal}`, value }] };
}

/* ------------------------------------------------------------------ trig */

/**
 * `sin(2x) = 0.5` has four solutions in a revolution, not one. Peeling stops
 * at the trig function and hands over here, because inverting it gives only
 * the principal value — reporting that alone would be wrong by omission.
 *
 * Everything outside the function has already been undone, so what is left is
 * `trig(u) = k`. Provided u is linear in x, every solution for u maps to one
 * for x, and both can be listed in full.
 */
function solveTrig(name: 'sin' | 'cos' | 'tan', inner: Expr, right: Expr, steps: Step[]): Outcome {
  const k = evaluateExpr(right);
  if (!Number.isFinite(k)) return cannot('The right-hand side isn’t a number.');
  if ((name === 'sin' || name === 'cos') && Math.abs(k) > 1) {
    return noSolution(`$\\${name}$ is never outside $-1$ to $1$, so $\\${name}(\\ldots) = ${fmt(k)}$ has no solution.`);
  }

  // u = px + q, found by measuring rather than pattern-matching.
  const q = evaluateExpr(inner, { x: 0 });
  const p = evaluateExpr(inner, { x: 1 }) - q;
  const check = evaluateExpr(inner, { x: 2 });
  if (!Number.isFinite(p) || p === 0 || Math.abs(check - (2 * p + q)) > 1e-9) {
    return cannot('The angle inside has to be a straight-line expression in $x$ for this method.');
  }

  const period = name === 'tan' ? 180 : 360;
  const principal =
    name === 'sin' ? rad2deg(Math.asin(k)) : name === 'cos' ? rad2deg(Math.acos(k)) : rad2deg(Math.atan(k));
  const family = name === 'sin' ? [principal, 180 - principal] : name === 'cos' ? [principal, -principal] : [principal];

  const u = toLatex(inner);
  steps.push({
    note: `Take the inverse ${name === 'sin' ? 'sine' : name === 'cos' ? 'cosine' : 'tangent'} to get the first angle. Angles are in degrees.`,
    latex: `${u} = \\${name}^{-1}\\left(${fmt(k, 6)}\\right) = ${fmt(principal, 4)}^{\\circ}`,
    annotation: 'principal value',
  });
  if (name === 'sin') {
    steps.push({
      note: 'Sine is positive in the first and second quadrants and takes the same value at supplementary angles, so there is a second angle in the revolution.',
      latex: `${u} = 180^{\\circ} - ${fmt(principal, 4)}^{\\circ} = ${fmt(180 - principal, 4)}^{\\circ}`,
      annotation: 'second quadrant',
    });
  } else if (name === 'cos') {
    steps.push({
      note: 'Cosine takes the same value either side of the horizontal axis, so the second angle is the negative of the first.',
      latex: `${u} = -${fmt(principal, 4)}^{\\circ} \\;\\text{(that is }${fmt(360 - principal, 4)}^{\\circ}\\text{)}`,
      annotation: 'fourth quadrant',
    });
  }
  steps.push({
    note: `$\\${name}$ repeats every $${period}^{\\circ}$, so add whole revolutions to catch every angle.`,
    latex: `${u} = ${family.map((a) => `${fmt(a, 4)}^{\\circ}`).join(' \\;\\text{or}\\; ')} \\;+\\; ${period}^{\\circ}n`,
    annotation: 'general solution',
  });

  // Turn each angle back into a value of x, keeping one revolution of them.
  const found: number[] = [];
  for (const angle of family) {
    const lo = Math.min(q, 360 * p + q);
    const hi = Math.max(q, 360 * p + q);
    for (let n = Math.floor((lo - angle) / period) - 1; n <= Math.ceil((hi - angle) / period) + 1; n++) {
      const x = (angle + period * n - q) / p;
      if (x >= -1e-9 && x < 360 - 1e-9) found.push(Math.round(x * 1e6) / 1e6);
    }
  }
  const solutions = [...new Set(found)].sort((a, b) => a - b);
  if (!solutions.length) return cannot('No angle in one revolution satisfies that.');
  if (solutions.length > 24) return cannot('That has too many solutions in a revolution to list.');

  if (p !== 1 || q !== 0) {
    steps.push({
      note: `Undo the angle to get $x$ on its own: $${u} = ${fmt(p)}x${q === 0 ? '' : q < 0 ? ` - ${fmt(-q)}` : ` + ${fmt(q)}`}$.`,
      latex: `x = \\dfrac{${u === 'x' ? 'u' : u} - ${fmt(q)}}{${fmt(p)}}`,
    });
  }
  steps.push({
    note: `Take every value of $n$ that leaves $x$ between $0^{\\circ}$ and $360^{\\circ}$.`,
    latex: solutions.map((x) => `x = ${fmt(x, 4)}^{\\circ}`).join(', \\quad '),
    annotation: solutions.length === 1 ? 'solved' : `${solutions.length} solutions`,
  });

  return { ok: true, answers: solutions.map((x) => ({ latex: `x = ${fmt(x, 4)}^{\\circ}`, value: x })) };
}

/** Two branches can land on the same root; it is one solution, not two. */
function distinct(answers: Answer[]): Answer[] {
  const seen = new Set<number>();
  return answers.filter((a) => {
    const key = Math.round(a.value * 1e9);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ---------------------------------------------------------------- solver */

export const inverseSolver: Solver = {
  id: 'inverse',
  title: 'Solving by undoing',
  subjects: ['General', 'Methods', 'Specialist'],
  blurb: 'Undo brackets, fractions, powers, roots, logs and exponentials one layer at a time.',
  placeholder: 'e.g.  ln(x + 5) = 5   or   2(x + 3) = 10',
  methods: [
    {
      id: 'undo',
      name: 'Inverse operations',
      blurb: 'Work from the outside in, undoing each operation on both sides until x is on its own.',
    },
  ],
  defaultMethodId: 'undo',
  detect(input) {
    if (!readEquation(input)) return 0;
    // Deliberately below every solver that recognises a specific shape, so a
    // question with a topic of its own keeps the working written for it. This
    // one takes what would otherwise fall through.
    return 0.7;
  },
  solve(input): SolveResult {
    const eq = readEquation(input);
    if (!eq) {
      return {
        ok: false,
        error: 'Write an equation with one unknown appearing once, e.g.  ln(x + 5) = 5  or  2(x + 3) = 10.',
      };
    }

    const steps: Step[] = [
      { note: 'Write down the equation.', latex: `${toLatex(eq.left)} = ${toLatex(eq.right)}` },
    ];
    const outcome = isolate(eq, steps);
    if (!outcome.ok) {
      // A proof that nothing works is an answer, and the working that reaches
      // it is worth reading. Not being able to do the question is not — that
      // has to fail out loud so the student isn't shown a dead end dressed up
      // as a conclusion.
      if (!outcome.proven) return { ok: false, error: outcome.why.replace(/\$/g, '') };
      steps.push({ note: outcome.why, latex: '\\text{No real solutions}', annotation: 'no solution' });
      return {
        ok: true,
        solution: {
          headline: `Solve $${toLatex(eq.left)} = ${toLatex(eq.right)}$`,
          methodName: 'Inverse operations',
          steps,
        },
      };
    }

    return {
      ok: true,
      solution: {
        headline: `Solve $${toLatex(eq.left)} = ${toLatex(eq.right)}$`,
        methodName: 'Inverse operations',
        steps,
        answerLatex: distinct(outcome.answers)
          .map((a) => a.latex)
          .join(', \\quad '),
      },
    };
  },
};
