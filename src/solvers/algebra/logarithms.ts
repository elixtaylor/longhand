import { fmt, par } from '../../lib/math/num';
import { Rational } from '../../lib/math/rational';
import { quadraticRoots } from '../quadratics';
import type {
  LogarithmBase,
  SolveOptions,
  Solver,
  Step,
  SolveResult,
} from '../../lib/engine/types';

/**
 * Logarithmic and exponential equations
 * (SACE Stage 2 Mathematical Methods, Topic 4).
 */
type QuadTerm =
  | {
      kind: 'exp';
      coeff: number;
      base: number;
      mult: number;
      k: number;
      variable: string;
    }
  | { kind: 'const'; value: number };

type Problem =
  | {
      kind: 'exponential';
      coeff: number;
      base: number | 'e';
      mult: number;
      variable: string;
      value: number;
    }
  | {
      kind: 'exponential-expression';
      coeff: number;
      base: number | 'e';
      mult: number;
      variable: string;
    }
  | { kind: 'evaluate'; base: number | 'e'; value: number }
  | { kind: 'log-equation'; base: number | 'e'; value: number }
  | {
      kind: 'exponential-quadratic';
      terms: QuadTerm[];
      rhs: number;
      unitBase: number;
      variable: string;
      a: number;
      b: number;
      c: number;
    };

const clean = (s: string) => s.replace(/\s+/g, '');

function parse(inputRaw: string): Problem {
  const s = clean(inputRaw);

  // b^x = c, optionally with a coefficient and a multiple of one variable:
  // 5*2^(3x)=40 or 1.3*2^(0.08k)=10.
  const exp = s.includes('^')
    ? s.match(
        /^(?:(\d+(?:\.\d*)?|\.\d+)[*×])?(\d+(?:\.\d*)?|\.\d+|e)\^\(?([+-]?(?:\d+(?:\.\d*)?|\.\d+)?)?([a-df-zA-DF-Z])\)?=(-?(?:\d+(?:\.\d*)?|\.\d+))$/i,
      )
    : null;
  if (exp) {
    const multiplier = exp[3];
    return {
      kind: 'exponential',
      coeff: exp[1] ? Number(exp[1]) : 1,
      base: exp[2].toLowerCase() === 'e' ? 'e' : Number(exp[2]),
      mult:
        multiplier === undefined || multiplier === '' || multiplier === '+'
          ? 1
          : multiplier === '-'
            ? -1
            : Number(multiplier),
      variable: exp[4],
      value: Number(exp[5]),
    };
  }

  // An expression such as 1.3*2^(0.08k) is a valid exponential model even
  // without an equals sign. Keep it as a function for the preview and give a
  // useful symbolic result; adding `= value` then uses the equation path above
  // to solve for the variable.
  const expression =
    !s.includes('=') &&
    s.includes('^') &&
    s.match(
      /^(?:(\d+(?:\.\d*)?|\.\d+)[*×])?(\d+(?:\.\d*)?|\.\d+|e)\^\(?([+-]?(?:\d+(?:\.\d*)?|\.\d+)?)?([a-df-zA-DF-Z])\)?$/i,
    );
  if (expression) {
    const multiplier = expression[3];
    return {
      kind: 'exponential-expression',
      coeff: expression[1] ? Number(expression[1]) : 1,
      base: expression[2].toLowerCase() === 'e' ? 'e' : Number(expression[2]),
      mult:
        multiplier === undefined || multiplier === '' || multiplier === '+'
          ? 1
          : multiplier === '-'
            ? -1
            : Number(multiplier),
      variable: expression[4],
    };
  }

  // Several exponential terms that reduce to a quadratic once one of them
  // is recognised as a common base's square: 4^x+2^(x+1)-15=0
  const quad = s.includes('^') ? parseExpQuadratic(s) : null;
  if (quad) return quad;

  // log_b(x) = c  /  ln(x) = c   → solve for x
  const logEq = /^(?:log|ln)/i.test(s)
    ? s.match(/^(?:log_?(\d*\.?\d+)?|ln)\(?x\)?=(-?\d*\.?\d+)$/i)
    : null;
  if (logEq) {
    const isLn = /^ln/i.test(s);
    return {
      kind: 'log-equation',
      base: isLn ? 'e' : logEq[1] ? Number(logEq[1]) : 10,
      value: Number(logEq[2]),
    };
  }

  // log_b(c) / log(c) / ln(c) → evaluate
  const evalLog = /^(?:log|ln)/i.test(s)
    ? s.match(/^(?:log_?(\d*\.?\d+)?|ln)\(?(\d*\.?\d+)\)?$/i)
    : null;
  if (evalLog) {
    const isLn = /^ln/i.test(s);
    return {
      kind: 'evaluate',
      base: isLn ? 'e' : evalLog[1] ? Number(evalLog[1]) : 10,
      value: Number(evalLog[2]),
    };
  }

  // Change-of-base written out as a fraction of two logs, e.g. log16/log8 —
  // this is exactly log_8(16), whichever common base the two logs share.
  const fracIdx = s.indexOf('/');
  if (fracIdx > 0) {
    const numTerm = parseLogTerm(s.slice(0, fracIdx));
    const denTerm = parseLogTerm(s.slice(fracIdx + 1));
    if (
      numTerm &&
      denTerm &&
      numTerm.isLn === denTerm.isLn &&
      numTerm.base === denTerm.base
    ) {
      return { kind: 'evaluate', base: denTerm.value, value: numTerm.value };
    }
  }

  throw new Error('Try  2^x = 32,  log2(32),  or  ln x = 2.');
}

/** Parses one log/ln call for use on each side of a log16/log8-style
 * fraction. Unlike the `evalLog` pattern above, a base is only ever read
 * from digits directly before a *mandatory* paren (log2(16) is base 2) —
 * without parens there is no way to tell "log16" apart from "log₁6", so a
 * bare term (log16, ln16) is always the default base with the digits as
 * the value. */
function parseLogTerm(
  raw: string,
): { isLn: boolean; base: number; value: number } | null {
  const isLn = /^ln/i.test(raw);
  const withParens = raw.match(/^(?:log_?(\d*\.?\d+)?|ln)\((\d*\.?\d+)\)$/i);
  if (withParens) {
    return {
      isLn,
      base: isLn ? Math.E : withParens[1] ? Number(withParens[1]) : 10,
      value: Number(withParens[2]),
    };
  }
  const bare = raw.match(/^(?:log|ln)(\d*\.?\d+)$/i);
  if (bare) {
    return { isLn, base: isLn ? Math.E : 10, value: Number(bare[1]) };
  }
  return null;
}

/** Splits "4^x+2^(x+1)-15" into ["4^x", "+2^(x+1)", "-15"] — a sign inside
 * the exponent's own parentheses is not a split point, only one at depth 0. */
function splitTerms(s: string): string[] {
  const terms: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if ((c === '+' || c === '-') && depth === 0 && i > start) {
      terms.push(s.slice(start, i));
      start = i;
    }
  }
  terms.push(s.slice(start));
  return terms.filter(Boolean);
}

/** Parses one signed term as a plain number or coeff·base^(mult·variable+k). */
function parseTerm(raw: string): QuadTerm | null {
  let s = raw;
  let sign = 1;
  if (s[0] === '+') s = s.slice(1);
  else if (s[0] === '-') {
    sign = -1;
    s = s.slice(1);
  }
  if (!s) return null;

  if (!s.includes('^')) {
    if (!/^\d*\.?\d+$/.test(s)) return null;
    return { kind: 'const', value: sign * Number(s) };
  }

  const caret = s.indexOf('^');
  const left = s.slice(0, caret);
  let right = s.slice(caret + 1);

  let coeff = 1;
  let baseStr = left;
  const coefMatch = left.match(/^(\d*\.?\d+)[*×](\d*\.?\d+)$/);
  if (coefMatch) {
    coeff = Number(coefMatch[1]);
    baseStr = coefMatch[2];
  } else if (!/^\d*\.?\d+$/.test(left)) {
    return null;
  }
  const base = Number(baseStr);
  if (!Number.isFinite(base) || base <= 0 || base === 1) return null;

  if (right.startsWith('(') && right.endsWith(')')) right = right.slice(1, -1);
  const expMatch = right.match(
    /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)?)?([a-df-zA-DF-Z])([+-](?:\d+(?:\.\d*)?|\.\d+))?$/,
  );
  if (!expMatch) return null;
  const multStr = expMatch[1];
  const mult =
    multStr === undefined || multStr === '' || multStr === '+'
      ? 1
      : multStr === '-'
        ? -1
        : Number(multStr);
  const k = expMatch[3] ? Number(expMatch[3]) : 0;

  return {
    kind: 'exp',
    coeff: sign * coeff,
    base,
    mult,
    k,
    variable: expMatch[2],
  };
}

/** Finds the smallest base that every exponential term's own base is an
 * exact power of — 1 or 2, enough to reduce the equation to a quadratic. */
function findUnitBase(
  effBases: number[],
): { unitBase: number; degrees: number[] } | null {
  const candidates = Array.from(new Set(effBases)).sort((x, y) => x - y);
  for (const ub of candidates) {
    const degrees = effBases.map((eb) => exactPower(ub, eb));
    if (
      degrees.every((d) => d === 1 || d === 2) &&
      degrees.some((d) => d === 2)
    ) {
      return { unitBase: ub, degrees: degrees as number[] };
    }
  }
  return null;
}

/** e.g. "4^x+2^(x+1)-15=0" — several exponential terms sharing a common base
 * (here 2, since 4 = 2²) reduce to a quadratic in u = base^x. Not every
 * multi-term exponential equation qualifies; when it doesn't, this returns
 * null and the caller falls through to try other problem shapes. */
function parseExpQuadratic(
  s: string,
): Extract<Problem, { kind: 'exponential-quadratic' }> | null {
  const eqIdx = s.indexOf('=');
  if (eqIdx < 0) return null;
  const lhsRaw = s.slice(0, eqIdx);
  const rhsRaw = s.slice(eqIdx + 1);
  if (!/^-?\d*\.?\d+$/.test(rhsRaw)) return null;
  const rhs = Number(rhsRaw);

  const termStrs = splitTerms(lhsRaw);
  if (termStrs.length < 2) return null;

  const terms: QuadTerm[] = [];
  for (const raw of termStrs) {
    const t = parseTerm(raw);
    if (!t) return null;
    terms.push(t);
  }
  const expTerms = terms.filter(
    (t): t is Extract<QuadTerm, { kind: 'exp' }> => t.kind === 'exp',
  );
  if (expTerms.length < 2) return null;
  const variable = expTerms[0].variable;
  if (expTerms.some((t) => t.variable !== variable)) return null;

  const effBases = expTerms.map((t) => Math.pow(t.base, t.mult));
  const found = findUnitBase(effBases);
  if (!found) return null;
  const { unitBase, degrees } = found;

  let a = 0;
  let b = 0;
  expTerms.forEach((t, i) => {
    const uCoeff = t.coeff * Math.pow(t.base, t.k);
    if (degrees[i] === 2) a += uCoeff;
    else b += uCoeff;
  });
  let c = -rhs;
  terms.forEach((t) => {
    if (t.kind === 'const') c += t.value;
  });

  return {
    kind: 'exponential-quadratic',
    terms,
    rhs,
    unitBase,
    variable,
    a,
    b,
    c,
  };
}

const baseTex = (b: number | 'e') => (b === 'e' ? 'e' : fmt(b));
const logName = (b: number | 'e') =>
  b === 'e' ? '\\ln' : b === 10 ? '\\log' : `\\log_{${fmt(b)}}`;
const lnOf = (b: number | 'e') => (b === 'e' ? 1 : Math.log(b));
const workingLogName = (base: LogarithmBase = 'natural') =>
  base === 'common' ? '\\log' : '\\ln';
const workingLogValue = (value: number, base: LogarithmBase = 'natural') =>
  base === 'common' ? Math.log10(value) : Math.log(value);
const workingLogDescription = (base: LogarithmBase = 'natural') =>
  base === 'common' ? 'base-10 logarithms' : 'natural logarithms';

/** Print a multiple of the unknown in an exponential index. */
const indexTex = (mult: number, variable: string): string =>
  mult === 1
    ? variable
    : mult === -1
      ? `-${variable}`
      : `${fmt(mult)}${variable}`;

/** Is `value` a neat whole power of `base`? Then the answer is exact. */
function exactPower(base: number, value: number): number | null {
  if (base <= 0 || base === 1 || value <= 0) return null;
  const p = Math.log(value) / Math.log(base);
  const r = Math.round(p);
  return Math.abs(p - r) < 1e-10 && Math.abs(Math.pow(base, r) - value) < 1e-9
    ? r
    : null;
}

function exactIndex(power: number, multiplier: number): string | null {
  if (
    !Number.isSafeInteger(power) ||
    !Number.isSafeInteger(multiplier) ||
    multiplier === 0
  )
    return null;
  const value = new Rational(power, multiplier);
  return value.isInt() ? String(value.n) : `\\frac{${value.n}}{${value.d}}`;
}

function exactLogValue(
  value: number,
  base: number,
  logarithmBase: LogarithmBase = 'natural',
): string | null {
  if (!(value > 0) || !(base > 0) || base === 1) return null;
  if (Math.abs(value - 1) < 1e-12) return '0';
  const symbol = workingLogName(logarithmBase);
  return `\\dfrac{${symbol}(${fmt(value, 12)})}{${symbol}(${fmt(base, 12)})}`;
}

function solveExponential(
  p: Extract<Problem, { kind: 'exponential' }>,
  methodId: string,
  options: SolveOptions = {},
): SolveResult {
  const { coeff, base, mult, variable, value } = p;
  const bNum = base === 'e' ? Math.E : base;
  const rhs = value / coeff;

  const original = `${coeff === 1 ? '' : `${fmt(coeff)} \\times `}${baseTex(base)}^{${indexTex(mult, variable)}} = ${fmt(value)}`;
  const steps: Step[] = [{ note: 'Write down the equation.', latex: original }];

  if (rhs <= 0) {
    return {
      ok: false,
      error: `A positive base can never give ${fmt(rhs)}, so there is no solution.`,
    };
  }
  if (coeff !== 1) {
    steps.push({
      note: `Divide both sides by ${fmt(coeff)} to get the power on its own.`,
      latex: `${baseTex(base)}^{${indexTex(mult, variable)}} = ${fmt(rhs, 6)}`,
    });
  }

  const power = base === 'e' ? null : exactPower(bNum, rhs);

  // Rewriting both sides to the same base is neater when the answer is exact.
  if (power !== null && methodId !== 'logs') {
    steps.push({
      note: `Write the right-hand side as a power of ${fmt(bNum)}.`,
      latex: `${baseTex(base)}^{${indexTex(mult, variable)}} = ${fmt(bNum)}^{${power}}`,
      annotation: `${fmt(bNum)}^${power} = ${fmt(rhs)}`,
    });
    steps.push({
      note: 'The bases match, so the indices must be equal.',
      latex:
        mult === 1
          ? `${variable} = ${power}`
          : `${indexTex(mult, variable)} = ${power}`,
    });
    if (mult !== 1) {
      steps.push({
        note: `Divide by ${fmt(mult)}.`,
        latex: `${variable} = ${exactIndex(power, mult) ?? fmt(power / mult, 6)}`,
      });
    }
    const x = power / mult;
    return {
      ok: true,
      solution: {
        headline: `Solve $${original}$`,
        methodName: 'Equating indices',
        steps,
        answerLatex: `${variable} = ${exactIndex(power, mult) ?? fmt(x, 6)}`,
      },
    };
  }

  // General case: take logarithms of both sides.
  const x = Math.log(rhs) / (lnOf(base) * mult);
  const workingLog = workingLogName(options.logarithmBase);
  steps.push({
    note: `Take ${workingLogDescription(options.logarithmBase)} of both sides so the power can come down.`,
    latex: `${workingLog}\\left(${baseTex(base)}^{${indexTex(mult, variable)}}\\right) = ${workingLog}(${fmt(rhs, 6)})`,
  });
  steps.push({
    note: `Use the power law $${workingLog}(a^{n}) = n${workingLog}a$ to bring the index down.`,
    latex: `${indexTex(mult, variable)} \\times ${workingLog}(${baseTex(base)}) = ${workingLog}(${fmt(rhs, 6)})`,
    annotation: 'power law',
  });
  steps.push({
    note: `Divide both sides by $${mult === 1 ? '' : `${fmt(mult)}`}${workingLog}(${baseTex(base)})$ to make $${variable}$ the subject.`,
    latex: `${variable} = \\dfrac{${workingLog}(${fmt(rhs, 6)})}{${mult === 1 ? '' : `${fmt(mult)} \\times `}${workingLog}(${baseTex(base)})}`,
  });
  steps.push({
    note: `Look up the two ${workingLogDescription(options.logarithmBase)}.`,
    latex: `${workingLog}(${fmt(rhs, 6)}) = ${fmt(workingLogValue(rhs, options.logarithmBase), 6)}, \\qquad ${workingLog}(${baseTex(base)}) = ${fmt(workingLogValue(bNum, options.logarithmBase), 6)}`,
  });
  steps.push({
    note: 'Work out the division.',
    latex: `${variable} = \\dfrac{${fmt(workingLogValue(rhs, options.logarithmBase), 6)}}{${mult === 1 ? '' : `${fmt(mult)} \\times `}${fmt(workingLogValue(bNum, options.logarithmBase), 6)}} = ${fmt(x, 6)}`,
    annotation: 'solved',
  });

  const exactPowerIndex = power === null ? null : exactIndex(power, mult);
  const exactLogAnswer =
    exactPowerIndex !== null
      ? `${variable} = ${exactPowerIndex}`
      : rhs === 1
        ? `${variable} = 0`
        : base === 'e'
          ? mult === 1
            ? `${variable} = ${workingLog}(${fmt(rhs, 12)})`
            : `${variable} = \\dfrac{${workingLog}(${fmt(rhs, 12)})}{${fmt(mult)}}`
          : `${variable} = \\dfrac{${workingLog}(${fmt(rhs, 12)})}{${mult === 1 ? '' : `${fmt(mult)} \\times `}${workingLog}(${baseTex(bNum)})}`;
  if (exactPowerIndex !== null) {
    steps.push({
      note: 'The logarithmic form simplifies to an exact index.',
      latex: exactLogAnswer,
      annotation: 'exact form',
    });
  }

  return {
    ok: true,
    solution: {
      headline: `Solve $${original}$`,
      methodName: 'Taking logarithms',
      steps,
      answerLatex: exactLogAnswer,
    },
  };
}

function solveExponentialExpression(
  p: Extract<Problem, { kind: 'exponential-expression' }>,
): SolveResult {
  const { coeff, base, mult, variable } = p;
  const expression = `${coeff === 1 ? '' : `${fmt(coeff)} \\times `}${baseTex(base)}^{${indexTex(mult, variable)}}`;
  return {
    ok: true,
    solution: {
      headline: `Simplify $${expression}$`,
      methodName: 'Exponential model',
      steps: [
        {
          note: 'Read the coefficient and the exponential factor as a product.',
          latex: `${fmt(coeff)} \\times ${baseTex(base)}^{${indexTex(mult, variable)}}`,
        },
        {
          note: `This expression is already in simplest exponential form. Add an equals sign and a known value to solve for $${variable}$.`,
          latex: `f(${variable}) = ${expression}`,
        },
      ],
      answerLatex: `f(${variable}) = ${expression}`,
    },
  };
}

function expLatex(mult: number, k: number, variable: string): string {
  const mPart = indexTex(mult, variable);
  if (k === 0) return mPart;
  return `${mPart} ${k > 0 ? '+' : '-'} ${fmt(Math.abs(k))}`;
}

function termTex(t: QuadTerm, leading: boolean): string {
  if (t.kind === 'const') {
    const sign = t.value < 0 ? '-' : leading ? '' : '+';
    return `${sign} ${fmt(Math.abs(t.value))}`;
  }
  const sign = t.coeff < 0 ? '-' : leading ? '' : '+';
  const absCoeff = Math.abs(t.coeff);
  const coeffTex = absCoeff === 1 ? '' : `${fmt(absCoeff)} \\times `;
  return `${sign} ${coeffTex}${fmt(t.base)}^{${expLatex(t.mult, t.k, t.variable)}}`;
}

/** "u^{2} + 2u - 15 = 0" — the reduced quadratic, in standard signed form. */
function quadInULatex(a: number, b: number, c: number): string {
  const aPart = `${a === 1 ? '' : a === -1 ? '-' : fmt(a)}u^{2}`;
  const bPart =
    b === 0
      ? ''
      : ` ${b > 0 ? '+' : '-'} ${Math.abs(b) === 1 ? '' : fmt(Math.abs(b))}u`;
  const cPart = c === 0 ? '' : ` ${c > 0 ? '+' : '-'} ${fmt(Math.abs(c))}`;
  return `${aPart}${bPart}${cPart} = 0`;
}

/**
 * Several exponential terms sharing a common base reduce to an ordinary
 * quadratic once substituted — e.g. 4^x + 2^(x+1) - 15 = 0 becomes
 * u² + 2u - 15 = 0 with u = 2^x. This is genuinely two SACE topics chained
 * together (quadratics, then logs), so the steps below show both halves
 * rather than folding the quadratic-solving into one opaque line.
 */
function solveExponentialQuadratic(
  p: Extract<Problem, { kind: 'exponential-quadratic' }>,
  _methodId: string,
  options: SolveOptions = {},
): SolveResult {
  const { terms, rhs, unitBase, variable, a, b, c } = p;

  const original = `${terms.map((t, i) => termTex(t, i === 0)).join(' ')} = ${fmt(rhs)}`;
  const steps: Step[] = [{ note: 'Write down the equation.', latex: original }];

  const expTerms = terms.filter(
    (t): t is Extract<QuadTerm, { kind: 'exp' }> => t.kind === 'exp',
  );
  const effBases = expTerms.map((t) => Math.pow(t.base, t.mult));
  const degrees = effBases.map((eb) => exactPower(unitBase, eb)!);

  const rewrites = expTerms
    .map((t, i) => {
      const degree = degrees[i];
      if (degree === 1 && t.mult === 1 && t.k === 0) return null;
      const baseToK = Math.pow(t.base, t.k);
      const uPart =
        degree === 1
          ? `${fmt(unitBase)}^{${variable}}`
          : `(${fmt(unitBase)}^{${variable}})^{${degree}}`;
      const rhsTex = t.k === 0 ? uPart : `${fmt(baseToK)} \\times ${uPart}`;
      return `${fmt(t.base)}^{${expLatex(t.mult, t.k, variable)}} = ${rhsTex}`;
    })
    .filter((x): x is string => x !== null);

  if (rewrites.length > 0) {
    steps.push({
      note: `Every power here is a power of ${fmt(unitBase)}, so rewrite each one that way.`,
      latex: rewrites.join(', \\qquad '),
    });
  }

  steps.push({
    note: `Let $u = ${fmt(unitBase)}^{${variable}}$. Substituting turns this into an ordinary quadratic in $u$.`,
    latex: quadInULatex(a, b, c),
  });

  const info = quadraticRoots(a, b, c);
  if (info.nature === 'complex') {
    return {
      ok: false,
      error:
        'That quadratic has no real solutions for u, so the original equation has none either.',
    };
  }

  steps.push({
    note: 'Solve this quadratic for $u$ (see the Quadratics topic for the working) using the quadratic formula.',
    latex: `u = \\dfrac{-(${par(b)}) \\pm \\sqrt{(${par(b)})^{2} - 4(${par(a)})(${par(c)})}}{2(${par(a)})}`,
  });
  steps.push({
    note: 'Work out the roots.',
    latex:
      info.nature === 'double'
        ? `u = ${fmt(info.numericRoots[0], 6)}`
        : `u = ${fmt(info.numericRoots[0], 6)} \\quad\\text{or}\\quad u = ${fmt(info.numericRoots[1], 6)}`,
  });

  const uRoots =
    info.nature === 'double' ? [info.numericRoots[0]] : info.numericRoots;
  const valid = uRoots.filter((u) => u > 1e-9);
  const rejected = uRoots.filter((u) => u <= 1e-9);

  if (rejected.length > 0) {
    steps.push({
      note: `$u = ${fmt(unitBase)}^{${variable}}$ can never be zero or negative — a positive base to any power is always positive — so ${rejected.map((u) => `$u = ${fmt(u, 6)}$`).join(' and ')} ${rejected.length > 1 ? 'are' : 'is'} rejected.`,
      latex:
        valid.length > 0
          ? valid.map((u) => `u = ${fmt(u, 6)}`).join(', ')
          : '\\text{no valid values of } u \\text{ remain}',
    });
  }

  if (valid.length === 0) {
    return {
      ok: false,
      error:
        'Every value of u came out zero or negative, and u can never be negative, so this equation has no real solution.',
    };
  }

  const exactXs: string[] = [];
  const xs = valid.map((u) => {
    const exact = exactPower(unitBase, u);
    if (exact !== null) {
      steps.push({
        note: `Recognise $${fmt(u, 6)}$ as ${fmt(unitBase)} to the power ${exact}.`,
        latex: `${variable} = ${exact}`,
      });
      exactXs.push(String(exact));
      return exact;
    }
    const x = Math.log(u) / Math.log(unitBase);
    const workingLog = workingLogName(options.logarithmBase);
    steps.push({
      note: `Take ${workingLogDescription(options.logarithmBase)} to solve $${fmt(unitBase)}^{${variable}} = ${fmt(u, 6)}$.`,
      latex: `${variable} = \\dfrac{${workingLog}(${fmt(u, 6)})}{${workingLog}(${fmt(unitBase)})} = ${fmt(x, 6)}`,
    });
    exactXs.push(
      exactLogValue(u, unitBase, options.logarithmBase) ?? fmt(x, 6),
    );
    return x;
  });

  const answerLatex =
    exactXs.length === xs.length
      ? exactXs.length > 1
        ? `${variable} = ${exactXs[0]} \\quad\\text{or}\\quad ${variable} = ${exactXs[1]}`
        : `${variable} = ${exactXs[0]}`
      : xs.length > 1
        ? `${variable} = ${fmt(xs[0], 6)} \\quad\\text{or}\\quad ${variable} = ${fmt(xs[1], 6)}`
        : `${variable} = ${fmt(xs[0], 6)}`;

  return {
    ok: true,
    solution: {
      headline: `Solve $${original}$`,
      methodName: 'Reducible to a quadratic',
      steps,
      answerLatex,
    },
  };
}

export const logarithmsSolver: Solver = {
  id: 'logarithms',
  title: 'Logs & exponentials',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Solve exponential equations and evaluate logarithms.',
  placeholder: 'e.g.  2^x = 32,  log2(32),  or  4^x+2^(x+1)=15',
  methods: [
    {
      id: 'same-base',
      name: 'Equating indices',
      blurb:
        'Rewrite both sides with the same base, then match the powers. Exact when it works.',
    },
    {
      id: 'logs',
      name: 'Taking logs',
      blurb:
        'Take logarithms of both sides and use the power law. Always works.',
    },
  ],
  defaultMethodId: 'same-base',
  detect(input) {
    try {
      parse(input);
      return 0.95;
    } catch {
      return 0;
    }
  },
  solve(input, methodId, options = {}): SolveResult {
    let p: Problem;
    try {
      p = parse(input);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Could not read that.',
      };
    }

    if (p.kind === 'exponential') return solveExponential(p, methodId, options);
    if (p.kind === 'exponential-expression')
      return solveExponentialExpression(p);
    if (p.kind === 'exponential-quadratic')
      return solveExponentialQuadratic(p, methodId, options);

    if (p.kind === 'log-equation') {
      const { base, value } = p;
      const bNum = base === 'e' ? Math.E : base;
      // Math.pow(Math.E, n) compounds the rounding already in Math.E; Math.exp
      // is computed directly and is what the expression engine uses, so the
      // same question routed two ways gives the same number.
      const x = base === 'e' ? Math.exp(value) : Math.pow(bNum, value);
      const b = baseTex(base);
      const L = logName(base);
      const exactPower =
        Number.isInteger(value) && base !== 'e'
          ? Number.isSafeInteger(Math.pow(bNum, value))
            ? fmt(Math.pow(bNum, value))
            : `${b}^{${fmt(value)}}`
          : value === 0
            ? '1'
            : `${b}^{${fmt(value)}}`;

      // Going straight from "ln x = 5" to "x = e^5" hides the move that
      // justifies it. Raising both sides as a power of the base is an
      // ordinary do-the-same-to-both-sides step, and seeing it written out is
      // what makes the cancellation obvious rather than a rule to memorise.
      const steps: Step[] = [
        { note: 'Write down the equation.', latex: `${L} x = ${fmt(value)}` },
        {
          note: `To undo a logarithm, raise ${base === 'e' ? '$e$' : `$${b}$`} to the power of each side. Doing the same thing to both sides keeps the equation true.`,
          latex: `${b}^{\\,${L} x} = ${b}^{\\,${fmt(value)}}`,
          annotation: 'same to both sides',
        },
        {
          note: `$${b}^{\\,${L} x}$ and $${L} x$ undo each other — raising to a power and taking a logarithm of the same base are inverse operations — so the left-hand side is just $x$.`,
          latex: `x = ${b}^{\\,${fmt(value)}}`,
          annotation: 'index form',
        },
      ];

      // When the base and index are whole, the power is worth expanding.
      if (Number.isInteger(value) && value > 1 && value <= 6 && base !== 'e') {
        steps.push({
          note: `Expand the power: ${b} multiplied by itself ${fmt(value)} times.`,
          latex: `x = ${Array(value).fill(b).join(' \\times ')}`,
        });
      }
      steps.push({
        note:
          base === 'e'
            ? 'Work out that power of $e$ on a calculator.'
            : 'Work out that power.',
        latex: `x = ${fmt(x, 6)}`,
        annotation: 'solved',
      });
      steps.push({
        note: 'Keep the inverse operation in exact form before the decimal check.',
        latex: `x = ${exactPower}`,
        annotation: 'exact form',
      });

      return {
        ok: true,
        solution: {
          headline: `Solve $${L} x = ${fmt(value)}$`,
          methodName: 'Converting to index form',
          steps,
          answerLatex: `x = ${exactPower}`,
        },
      };
    }

    // Evaluate a logarithm.
    const { base, value } = p;
    const bNum = base === 'e' ? Math.E : base;
    if (value <= 0) {
      return {
        ok: false,
        error: 'You can only take the logarithm of a positive number.',
      };
    }
    const result = Math.log(value) / lnOf(base);
    const workingLog = workingLogName(options.logarithmBase);
    const exact = base === 'e' ? null : exactPower(bNum, value);
    const steps: Step[] = [
      {
        note: 'A logarithm asks: what power do I raise the base to, to get this number?',
        latex: `${logName(base)}(${fmt(value)}) = x \\;\\Longleftrightarrow\\; ${baseTex(base)}^{x} = ${fmt(value)}`,
      },
    ];
    if (exact !== null) {
      steps.push({
        note: `Write ${fmt(value)} as a power of ${fmt(bNum)}.`,
        latex: `${fmt(value)} = ${fmt(bNum)}^{${exact}}`,
        annotation: 'exact power',
      });
      steps.push({
        note: 'So the logarithm is that index.',
        latex: `${logName(base)}(${fmt(value)}) = ${exact}`,
        annotation: 'answer',
      });
    } else {
      // One line used to do three things: state the rule, look up both
      // logarithms, and divide. Split so each is checkable on a calculator.
      steps.push({
        note: `It isn’t a whole power, so use the change-of-base rule with ${workingLogDescription(options.logarithmBase)}.`,
        latex: `${logName(base)}(${fmt(value)}) = \\dfrac{${workingLog} ${fmt(value)}}{${workingLog} ${baseTex(base)}}`,
        annotation: 'change of base',
      });
      steps.push({
        note: `Look up the two ${workingLogDescription(options.logarithmBase)}.`,
        latex: `${workingLog} ${fmt(value)} = ${fmt(workingLogValue(value, options.logarithmBase), 6)}, \\qquad ${workingLog} ${baseTex(base)} = ${fmt(workingLogValue(bNum, options.logarithmBase), 6)}`,
      });
      steps.push({
        note: 'Divide one by the other.',
        latex: `${logName(base)}(${fmt(value)}) = \\dfrac{${fmt(workingLogValue(value, options.logarithmBase), 6)}}{${fmt(workingLogValue(bNum, options.logarithmBase), 6)}} = ${fmt(result, 6)}`,
        annotation: 'answer',
      });
    }
    return {
      ok: true,
      solution: {
        headline: `Evaluate $${logName(base)}(${fmt(value)})$`,
        methodName: exact !== null ? 'Recognising the power' : 'Change of base',
        steps,
        answerLatex: `${logName(base)}(${fmt(value)}) = ${exact !== null ? exact : fmt(result, 6)}`,
      },
    };
  },
};
