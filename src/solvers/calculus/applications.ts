import { Rational } from '../../lib/math/rational';
import { parsePoly, Poly, ParseError } from '../../lib/math/parse';
import { polyLatex, rl } from '../../lib/math/format';
import { realRoots, evaluatePoly } from '../../lib/math/roots';
import { fmt, par } from '../../lib/math/num';
import { differentiate } from './differentiate';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * The questions that live between two topics.
 *
 * "Find the stationary points of x³ − 3x" is a differentiation question and an
 * equation-solving question, and no student is ever told which one it is. The
 * same goes for a gradient at a point, a tangent, or a turning point. Working
 * them as one topic is what lets the steps show the join: differentiate, then
 * solve what you differentiated, then interpret the answer.
 *
 * Before this existed, "the turning point of y = x² − 6x + 5" was picked up by
 * curve sketching, which confidently answered a different question (where the
 * curve cuts the axes).
 */

/** Strip the wording, leaving the function of x. */
function functionPart(input: string): string {
  return input
    .replace(/\b(?:the|a|an|of|for|to|on|curve|graph|function|where)\b/gi, ' ')
    .replace(
      /\b(?:gradient|slope|stationary|turning|point|points|tangent|normal|maximum|minimum|max|min|nature|classify|equation)\b/gi,
      ' ',
    )
    .replace(/\bat\s+x\s*=\s*-?\d+(?:\.\d+)?/gi, ' ')
    .replace(/\bwhen\s+x\s*=\s*-?\d+(?:\.\d+)?/gi, ' ')
    .replace(/\by\s*=|f\s*\(x\)\s*=/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The x-value a question asks about, from "at x = 3" or "when x = 3". */
function pointAt(input: string): number | null {
  const m = /\b(?:at|when)\s+x\s*=\s*(-?\d+(?:\.\d+)?)/i.exec(input);
  return m ? Number(m[1]) : null;
}

function parseFn(input: string): Poly {
  const p = parsePoly(functionPart(input), 'x');
  if (p.isZeroPoly()) throw new ParseError('Enter a function of x, e.g.  y = x^3 - 3x');
  return p;
}

/** "f(x) = …" alongside its derivative — the step both methods start from. */
function derivativeSteps(f: Poly, fd: Poly): Step[] {
  return [
    {
      note: 'Start from the function itself.',
      latex: `f(x) = ${polyLatex(f)}`,
    },
    {
      note: 'Differentiate term by term: bring the power down, then drop it by one.',
      latex: `f'(x) = ${polyLatex(fd)}`,
      annotation: 'power rule',
    },
  ];
}

/* ------------------------------------------------------------- gradient at */
function gradientAt(input: string): SolveResult {
  const f = parseFn(input);
  const x = pointAt(input);
  if (x === null) {
    return { ok: false, error: 'Say where to measure the gradient, e.g. “gradient of y = x^2 at x = 3”.' };
  }
  const fd = differentiate(f);
  const m = evaluatePoly(fd, x);
  const y = evaluatePoly(f, x);

  const steps: Step[] = [
    ...derivativeSteps(f, fd),
    {
      note: `The gradient at a point is the derivative evaluated there, so substitute x = ${fmt(x)}.`,
      latex: `f'(${par(x)}) = ${substituted(fd, x)}`,
    },
    {
      note: 'Work that out.',
      latex: `f'(${par(x)}) = ${fmt(m, 4)}`,
      annotation: 'gradient',
    },
    {
      note: `For reference, the point itself is at y = f(${fmt(x)}).`,
      latex: `f(${par(x)}) = ${fmt(y, 4)} \\quad\\Rightarrow\\quad \\left(${fmt(x)},\\; ${fmt(y, 4)}\\right)`,
    },
  ];

  return {
    ok: true,
    solution: {
      headline: `Gradient of ${polyLatex(f)} at x = ${fmt(x)}`,
      methodName: 'Gradient at a point',
      steps,
      answerLatex: `\\text{gradient} = ${fmt(m, 4)}`,
    },
  };
}

/** f'(x) with the value written into every term, before it is worked out. */
function substituted(p: Poly, x: number): string {
  const terms = p.terms();
  if (terms.length === 0) return '0';
  return terms
    .map(({ coeff, power }, i) => {
      const body =
        power === 0 ? rl(coeff) : `${coeff.eq(Rational.int(1)) ? '' : rl(coeff)}${par(x)}${power > 1 ? `^{${power}}` : ''}`;
      return i === 0 ? body : coeff.isNeg() ? ` ${body}` : ` + ${body}`;
    })
    .join('');
}

/* --------------------------------------------------------- stationary points */
function stationaryPoints(input: string, wording: 'stationary' | 'turning'): SolveResult {
  const f = parseFn(input);
  const fd = differentiate(f);
  if (fd.isZeroPoly()) {
    return { ok: false, error: 'That function has a constant gradient, so it has no stationary points.' };
  }
  const fdd = differentiate(fd);
  const xs = realRoots(fd).sort((a, b) => a - b);

  const steps: Step[] = [
    ...derivativeSteps(f, fd),
    {
      note: 'A stationary point is where the curve is momentarily flat, so set the derivative to zero.',
      latex: `${polyLatex(fd)} = 0`,
      annotation: "f'(x) = 0",
    },
  ];

  if (xs.length === 0) {
    steps.push({
      note: 'This equation has no real solutions, so the gradient is never zero.',
      latex: `\\text{no real } x \\text{ with } f'(x) = 0`,
    });
    return {
      ok: true,
      solution: {
        headline: `${wording === 'turning' ? 'Turning' : 'Stationary'} points of ${polyLatex(f)}`,
        methodName: wording === 'turning' ? 'Turning points' : 'Stationary points',
        steps,
        answerLatex: '\\text{no stationary points}',
      },
    };
  }

  steps.push({
    note: xs.length === 1 ? 'Solving gives one value of x.' : `Solving gives ${xs.length} values of x.`,
    latex: `x = ${xs.map((x) => fmt(x, 4)).join(', \\quad x = ')}`,
  });

  const described: string[] = [];
  for (const x of xs) {
    const y = evaluatePoly(f, x);
    steps.push({
      note: `Substitute x = ${fmt(x, 4)} back into f(x) to get the height of the point.`,
      latex: `f(${par(x)}) = ${fmt(y, 4)} \\quad\\Rightarrow\\quad \\left(${fmt(x, 4)},\\; ${fmt(y, 4)}\\right)`,
    });

    // The second derivative decides which way the curve bends there, which is
    // what turns a bare coordinate into "maximum" or "minimum".
    const curvature = evaluatePoly(fdd, x);
    const nature =
      curvature > 0 ? 'minimum' : curvature < 0 ? 'maximum' : 'stationary point of inflection';
    steps.push({
      note:
        curvature === 0
          ? 'The second derivative is zero here, so the curve does not bend either way — check the gradient on each side.'
          : `The second derivative is ${curvature > 0 ? 'positive' : 'negative'}, so the curve bends ${curvature > 0 ? 'upwards' : 'downwards'} here.`,
      latex: `f''(x) = ${polyLatex(fdd)}, \\quad f''(${par(x)}) = ${fmt(curvature, 4)} \\;${curvature > 0 ? '>' : curvature < 0 ? '<' : '='}\\; 0`,
      annotation: nature,
    });
    described.push(`\\left(${fmt(x, 4)},\\; ${fmt(y, 4)}\\right)\\text{ ${nature}}`);
  }

  return {
    ok: true,
    solution: {
      headline: `${wording === 'turning' ? 'Turning' : 'Stationary'} points of ${polyLatex(f)}`,
      methodName: wording === 'turning' ? 'Turning points' : 'Stationary points',
      steps,
      answerLatex: described.join(', \\quad '),
    },
  };
}

/* ------------------------------------------------------ tangent and normal */
function lineAt(input: string, kind: 'tangent' | 'normal'): SolveResult {
  const f = parseFn(input);
  const x1 = pointAt(input);
  if (x1 === null) {
    return { ok: false, error: `Say where the ${kind} touches, e.g. “${kind} to y = x^2 at x = 3”.` };
  }
  const fd = differentiate(f);
  const slope = evaluatePoly(fd, x1);
  const y1 = evaluatePoly(f, x1);

  if (kind === 'normal' && slope === 0) {
    return { ok: false, error: 'The tangent is horizontal there, so the normal is the vertical line x = ' + fmt(x1) + '.' };
  }
  const m = kind === 'tangent' ? slope : -1 / slope;
  const c = y1 - m * x1;

  const steps: Step[] = [
    ...derivativeSteps(f, fd),
    {
      note: `The gradient of the curve at x = ${fmt(x1)} is the derivative there.`,
      latex: `f'(${par(x1)}) = ${fmt(slope, 4)}`,
    },
    {
      note: 'Find the point the line passes through.',
      latex: `f(${par(x1)}) = ${fmt(y1, 4)} \\quad\\Rightarrow\\quad \\left(${fmt(x1)},\\; ${fmt(y1, 4)}\\right)`,
    },
  ];

  if (kind === 'normal') {
    steps.push({
      note: 'The normal is perpendicular to the tangent, so its gradient is the negative reciprocal.',
      latex: `m = -\\frac{1}{${fmt(slope, 4)}} = ${fmt(m, 4)}`,
      annotation: 'perpendicular',
    });
  }

  steps.push(
    {
      note: 'Use the point–gradient form of a straight line.',
      latex: `y - ${par(y1)} = ${fmt(m, 4)}\\left(x - ${par(x1)}\\right)`,
      annotation: 'y − y₁ = m(x − x₁)',
    },
    {
      note: 'Expand the bracket.',
      latex: `y = ${fmt(m, 4)}x ${m * x1 < 0 ? '+' : '-'} ${fmt(Math.abs(m * x1), 4)} ${y1 < 0 ? '-' : '+'} ${fmt(Math.abs(y1), 4)}`,
    },
    {
      note: 'Collect the constants.',
      latex: `y = ${fmt(m, 4)}x ${c < 0 ? '-' : '+'} ${fmt(Math.abs(c), 4)}`,
      annotation: kind,
    },
  );

  return {
    ok: true,
    solution: {
      headline: `${kind === 'tangent' ? 'Tangent' : 'Normal'} to ${polyLatex(f)} at x = ${fmt(x1)}`,
      methodName: kind === 'tangent' ? 'Tangent line' : 'Normal line',
      steps,
      answerLatex: `y = ${fmt(m, 4)}x ${c < 0 ? '-' : '+'} ${fmt(Math.abs(c), 4)}`,
    },
  };
}

/* ------------------------------------------------------------------ solver */
const GRADIENT = /\b(?:gradient|slope)\b/i;
const STATIONARY = /\bstationary\b|\bnature\s+of\b/i;
const TURNING = /\bturning\s+point|\bvertex\b|\b(?:maximum|minimum|max|min)\s+(?:point|value)?/i;
const TANGENT = /\btangent\b/i;
const NORMAL = /\bnormal\s+(?:to|line)\b/i;

export const calculusApplicationsSolver: Solver = {
  id: 'calculus-applications',
  title: 'Gradients, tangents & turning points',
  subjects: ['Methods', 'Specialist'],
  blurb:
    'Questions that need differentiation and equation solving together — the gradient at a point, stationary points and their nature, tangents and normals.',
  placeholder: 'stationary points of x^3 - 3x',
  methods: [
    { id: 'stationary', name: 'Stationary points', blurb: "Set f'(x) = 0, solve, then use f''(x) to say whether each is a maximum or a minimum." },
    { id: 'gradient', name: 'Gradient at a point', blurb: "Differentiate, then substitute the x-value into f'(x)." },
    { id: 'tangent', name: 'Tangent line', blurb: 'Gradient at the point, then y − y₁ = m(x − x₁).' },
    { id: 'normal', name: 'Normal line', blurb: 'Perpendicular to the tangent: gradient −1/m through the same point.' },
  ],
  defaultMethodId: 'stationary',

  detect(input) {
    const hasFn = /x\s*\^?\s*\d|x\b/i.test(input);
    if (!hasFn) return 0;
    // These phrasings name a task that spans two topics, so they are claimed
    // firmly — otherwise curve sketching or plain differentiation takes them
    // and answers a different question.
    if (NORMAL.test(input) && /\bat\b/i.test(input)) return 0.95;
    if (TANGENT.test(input) && /\bat\b/i.test(input)) return 0.95;
    if (STATIONARY.test(input)) return 0.95;
    if (TURNING.test(input)) return 0.92;
    if (GRADIENT.test(input) && /\b(?:at|when)\s+x\s*=/i.test(input)) return 0.95;
    if (GRADIENT.test(input)) return 0.5;
    return 0;
  },

  solve(input, methodId) {
    try {
      // What the question asks for outranks the method left selected in the
      // sidebar: a student who types "stationary points" means that.
      const asked = NORMAL.test(input)
        ? 'normal'
        : TANGENT.test(input)
          ? 'tangent'
          : STATIONARY.test(input)
            ? 'stationary'
            : TURNING.test(input)
              ? 'turning'
              : GRADIENT.test(input)
                ? 'gradient'
                : methodId;

      switch (asked) {
        case 'gradient':
          return gradientAt(input);
        case 'tangent':
          return lineAt(input, 'tangent');
        case 'normal':
          return lineAt(input, 'normal');
        case 'turning':
          return stationaryPoints(input, 'turning');
        default:
          return stationaryPoints(input, 'stationary');
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that function.' };
    }
  },
};
