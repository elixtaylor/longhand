/**
 * A small expression engine: parse → differentiate → simplify → LaTeX.
 *
 * Deliberately narrow. It covers what SACE Mathematical Methods and Specialist
 * actually ask for — polynomials, trigonometric, exponential and logarithmic
 * functions combined by +, −, ×, ÷, powers and composition — rather than
 * attempting a general computer algebra system.
 */

export type Expr =
  | { t: 'num'; v: number }
  | { t: 'var'; name: string }
  | { t: 'add'; a: Expr; b: Expr }
  | { t: 'sub'; a: Expr; b: Expr }
  | { t: 'mul'; a: Expr; b: Expr }
  | { t: 'div'; a: Expr; b: Expr }
  | { t: 'pow'; a: Expr; b: Expr }
  | { t: 'neg'; a: Expr }
  | { t: 'fn'; name: FnName; a: Expr };

import { isProseWord } from '../nl/vocabulary';

export type FnName = 'sin' | 'cos' | 'tan' | 'sec' | 'ln' | 'log' | 'exp' | 'sqrt';

export class ExprError extends Error {}

/** Functions a student can type. `sec` is produced by d(tan x) but not parsed. */
const FUNCTIONS: FnName[] = ['sin', 'cos', 'tan', 'ln', 'log', 'exp', 'sqrt'];

export const num = (v: number): Expr => ({ t: 'num', v });
export const variable = (name = 'x'): Expr => ({ t: 'var', name });

/* ------------------------------------------------------------- tokenising */
type Token = { k: 'num'; v: number } | { k: 'id'; v: string } | { k: 'op'; v: string };

function tokenise(src: string): Token[] {
  const s = src
    .replace(/\s+/g, '')
    .replace(/−/g, '-')
    .replace(/[×⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\d/.test(c) || (c === '.' && /\d/.test(s[i + 1] ?? ''))) {
      let j = i;
      while (j < s.length && /[\d.]/.test(s[j])) j++;
      const v = Number(s.slice(i, j));
      if (!Number.isFinite(v)) throw new ExprError(`Couldn't read the number "${s.slice(i, j)}".`);
      out.push({ k: 'num', v });
      i = j;
    } else if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      let word = s.slice(i, j);
      // An English word left in the input must stop the parse. Below, any
      // unrecognised run becomes a product of single-letter variables, which
      // would quietly turn "and stationary points" into a·n·d·s·t·… and hand
      // back a confident, wrong derivative.
      if (isProseWord(word)) {
        throw new ExprError(`“${word}” isn’t part of an expression.`);
      }
      // "sinx" should read as sin(x), not a variable called "sinx" — and
      // "sinxcosx" as sin(x)cos(x), so scan the whole run rather than peeling
      // a single leading function name off the front.
      let k = 0;
      while (k < word.length) {
        const fn = FUNCTIONS.find((f) => word.startsWith(f, k));
        if (fn) {
          out.push({ k: 'id', v: fn });
          k += fn.length;
        } else {
          out.push({ k: 'id', v: word[k] });
          k++;
        }
      }
      i = j;
    } else if ('+-*/^()'.includes(c)) {
      out.push({ k: 'op', v: c });
      i++;
    } else {
      throw new ExprError(`Unexpected character "${c}".`);
    }
  }
  return out;
}

/* ---------------------------------------------------------------- parsing */
export function parseExpr(src: string): Expr {
  const tokens = tokenise(src);
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];
  const eat = (v: string): boolean => {
    const t = peek();
    if (t && t.k === 'op' && t.v === v) {
      pos++;
      return true;
    }
    return false;
  };

  /** Does a new atom start here? Then it is an implicit multiplication. */
  function startsAtom(): boolean {
    const t = peek();
    if (!t) return false;
    if (t.k === 'num' || t.k === 'id') return true;
    return t.k === 'op' && t.v === '(';
  }

  function parseExpression(): Expr {
    let left = parseTerm();
    for (;;) {
      if (eat('+')) left = { t: 'add', a: left, b: parseTerm() };
      else if (eat('-')) left = { t: 'sub', a: left, b: parseTerm() };
      else return left;
    }
  }

  function parseTerm(): Expr {
    let left = parseUnary();
    for (;;) {
      if (eat('*')) left = { t: 'mul', a: left, b: parseUnary() };
      else if (eat('/')) left = { t: 'div', a: left, b: parseUnary() };
      else if (startsAtom()) left = { t: 'mul', a: left, b: parseUnary() };
      else return left;
    }
  }

  function parseUnary(): Expr {
    if (eat('-')) return { t: 'neg', a: parseUnary() };
    if (eat('+')) return parseUnary();
    return parsePower();
  }

  function parsePower(): Expr {
    const base = parseAtom();
    if (eat('^')) return { t: 'pow', a: base, b: parseUnary() };
    return base;
  }

  function parseAtom(): Expr {
    const t = peek();
    if (!t) throw new ExprError('The expression ends too early.');
    if (t.k === 'num') {
      pos++;
      return num(t.v);
    }
    if (t.k === 'id') {
      pos++;
      if (FUNCTIONS.includes(t.v as FnName)) {
        const name = t.v as FnName;
        // sin(2x) and sin 2x are both fine; sin x^2 means sin(x^2).
        const arg = eat('(') ? closeParen(parseExpression()) : parsePower();
        return { t: 'fn', name, a: arg };
      }
      return variable(t.v);
    }
    if (t.k === 'op' && t.v === '(') {
      pos++;
      return closeParen(parseExpression());
    }
    throw new ExprError(`Unexpected "${t.v}".`);
  }

  function closeParen(inner: Expr): Expr {
    if (!eat(')')) throw new ExprError('Missing a closing bracket.');
    return inner;
  }

  const result = parseExpression();
  if (pos < tokens.length) throw new ExprError('There is something left over at the end.');
  return result;
}

/* ----------------------------------------------------------- simplifying */
const isNum = (e: Expr, v: number): boolean => e.t === 'num' && Math.abs(e.v - v) < 1e-12;

export function simplify(e: Expr): Expr {
  switch (e.t) {
    case 'num':
    case 'var':
      return e;
    case 'neg': {
      const a = simplify(e.a);
      if (a.t === 'num') return num(-a.v);
      if (a.t === 'neg') return a.a;
      return { t: 'neg', a };
    }
    case 'add': {
      const a = simplify(e.a);
      const b = simplify(e.b);
      if (isNum(a, 0)) return b;
      if (isNum(b, 0)) return a;
      if (a.t === 'num' && b.t === 'num') return num(a.v + b.v);
      if (b.t === 'neg') return simplify({ t: 'sub', a, b: b.a });
      return { t: 'add', a, b };
    }
    case 'sub': {
      const a = simplify(e.a);
      const b = simplify(e.b);
      if (isNum(b, 0)) return a;
      if (a.t === 'num' && b.t === 'num') return num(a.v - b.v);
      if (isNum(a, 0)) return simplify({ t: 'neg', a: b });
      return { t: 'sub', a, b };
    }
    case 'mul': {
      /*
       * Flatten the whole product before simplifying so numeric factors
       * scattered through a nested chain collect into one coefficient —
       * the chain rule produces 2·5(2x+1)⁴, and a student writes 10(2x+1)⁴.
       */
      const parts: Expr[] = [];
      let coeff = 1;
      const flatten = (node: Expr): void => {
        if (node.t === 'mul') {
          flatten(node.a);
          flatten(node.b);
          return;
        }
        if (node.t === 'neg') {
          coeff = -coeff;
          flatten(node.a);
          return;
        }
        const s = simplify(node);
        if (s.t === 'num') coeff *= s.v;
        else if (s.t === 'neg' && s.a.t === 'num') coeff *= -s.a.v;
        else parts.push(s);
      };
      flatten(e);

      if (coeff === 0) return num(0);
      if (parts.length === 0) return num(coeff);
      const body = parts.reduce((acc, x) => ({ t: 'mul', a: acc, b: x }) as Expr);
      if (coeff === 1) return body;
      if (coeff === -1) return { t: 'neg', a: body };
      return { t: 'mul', a: num(coeff), b: body };
    }
    case 'div': {
      const a = simplify(e.a);
      const b = simplify(e.b);
      if (isNum(a, 0)) return num(0);
      if (isNum(b, 1)) return a;
      if (a.t === 'num' && b.t === 'num' && b.v !== 0 && Number.isInteger(a.v / b.v)) {
        return num(a.v / b.v);
      }
      return { t: 'div', a, b };
    }
    case 'pow': {
      const a = simplify(e.a);
      const b = simplify(e.b);
      if (isNum(b, 0)) return num(1);
      if (isNum(b, 1)) return a;
      if (a.t === 'num' && b.t === 'num') return num(Math.pow(a.v, b.v));
      return { t: 'pow', a, b };
    }
    case 'fn':
      return { t: 'fn', name: e.name, a: simplify(e.a) };
  }
}

/* -------------------------------------------------------- differentiating */
/** Which rule applies at the top level — used to narrate the working. */
export type RuleName = 'constant' | 'power' | 'product' | 'quotient' | 'chain' | 'sum' | 'standard';

export function topRule(e: Expr): RuleName {
  switch (e.t) {
    case 'num':
      return 'constant';
    case 'var':
      return 'power';
    case 'add':
    case 'sub':
      return 'sum';
    case 'mul':
      return isConstant(e.a) || isConstant(e.b) ? 'sum' : 'product';
    case 'div':
      return isConstant(e.b) ? 'sum' : 'quotient';
    case 'pow':
      return e.a.t === 'var' ? 'power' : 'chain';
    case 'fn':
      return e.a.t === 'var' ? 'standard' : 'chain';
    case 'neg':
      return topRule(e.a);
  }
}

export function isConstant(e: Expr): boolean {
  switch (e.t) {
    case 'num':
      return true;
    case 'var':
      return e.name !== 'x';
    case 'neg':
      return isConstant(e.a);
    case 'fn':
      return isConstant(e.a);
    default:
      return isConstant((e as { a: Expr }).a) && isConstant((e as { b: Expr }).b);
  }
}

export function differentiate(e: Expr): Expr {
  switch (e.t) {
    case 'num':
      return num(0);
    case 'var':
      return e.name === 'x' ? num(1) : num(0);
    case 'neg':
      return { t: 'neg', a: differentiate(e.a) };
    case 'add':
      return { t: 'add', a: differentiate(e.a), b: differentiate(e.b) };
    case 'sub':
      return { t: 'sub', a: differentiate(e.a), b: differentiate(e.b) };
    case 'mul':
      // product rule: (uv)' = u'v + uv'
      return {
        t: 'add',
        a: { t: 'mul', a: differentiate(e.a), b: e.b },
        b: { t: 'mul', a: e.a, b: differentiate(e.b) },
      };
    case 'div':
      // quotient rule: (u/v)' = (u'v − uv') / v²
      return {
        t: 'div',
        a: {
          t: 'sub',
          a: { t: 'mul', a: differentiate(e.a), b: e.b },
          b: { t: 'mul', a: e.a, b: differentiate(e.b) },
        },
        b: { t: 'pow', a: e.b, b: num(2) },
      };
    case 'pow': {
      const constantExponent = isConstant(e.b);
      const constantBase = isConstant(e.a);
      if (constantExponent) {
        // n·u^(n−1)·u'  — power rule with the chain rule
        const nMinus1: Expr = e.b.t === 'num' ? num(e.b.v - 1) : { t: 'sub', a: e.b, b: num(1) };
        return {
          t: 'mul',
          a: { t: 'mul', a: e.b, b: { t: 'pow', a: e.a, b: nMinus1 } },
          b: differentiate(e.a),
        };
      }
      if (constantBase) {
        // a^u · ln a · u'
        return {
          t: 'mul',
          a: { t: 'mul', a: e, b: { t: 'fn', name: 'ln', a: e.a } },
          b: differentiate(e.b),
        };
      }
      throw new ExprError('Differentiating a power with x in both the base and the index needs logarithmic differentiation, which isn’t supported yet.');
    }
    case 'fn': {
      const u = e.a;
      const du = differentiate(u);
      const outer = ((): Expr => {
        switch (e.name) {
          case 'sin':
            return { t: 'fn', name: 'cos', a: u };
          case 'cos':
            return { t: 'neg', a: { t: 'fn', name: 'sin', a: u } };
          case 'tan':
            return { t: 'pow', a: { t: 'fn', name: 'sec', a: u }, b: num(2) };
          case 'sec':
            return { t: 'mul', a: { t: 'fn', name: 'sec', a: u }, b: { t: 'fn', name: 'tan', a: u } };
          case 'exp':
            return { t: 'fn', name: 'exp', a: u };
          case 'ln':
            return { t: 'div', a: num(1), b: u };
          case 'log':
            return { t: 'div', a: num(1), b: { t: 'mul', a: u, b: { t: 'fn', name: 'ln', a: num(10) } } };
          case 'sqrt':
            return { t: 'div', a: num(1), b: { t: 'mul', a: num(2), b: { t: 'fn', name: 'sqrt', a: u } } };
        }
      })();
      return { t: 'mul', a: outer, b: du };
    }
  }
}

/* ------------------------------------------------------------------ LaTeX */
/** Binding power, so brackets appear only where they are needed. */
function precedence(e: Expr): number {
  switch (e.t) {
    case 'add':
    case 'sub':
      return 1;
    case 'mul':
      return 2;
    case 'div':
      return 2;
    case 'neg':
      return 3;
    case 'pow':
      return 4;
    default:
      return 5;
  }
}

function wrap(child: Expr, parentPrec: number): string {
  const s = toLatex(child);
  return precedence(child) < parentPrec ? `\\left(${s}\\right)` : s;
}

const FN_TEX: Record<string, string> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  sec: '\\sec',
  ln: '\\ln',
  log: '\\log',
  exp: 'e',
  sqrt: '\\sqrt',
};

export function toLatex(e: Expr): string {
  switch (e.t) {
    case 'num': {
      const v = e.v;
      if (Number.isInteger(v)) return String(v);
      return String(Math.round(v * 1e10) / 1e10);
    }
    case 'var':
      return e.name;
    case 'neg':
      return `-${wrap(e.a, 3)}`;
    case 'add': {
      // Nobody writes "2x + -4 sin x". A negative second term is a subtraction.
      const positive = withoutSign(e.b);
      if (positive) return `${wrap(e.a, 1)} - ${wrap(positive, 2)}`;
      return `${wrap(e.a, 1)} + ${wrap(e.b, 1)}`;
    }
    case 'sub':
      return `${wrap(e.a, 1)} - ${wrap(e.b, 2)}`;
    case 'mul': {
      /*
       * Maths is written by juxtaposition — 2x sin x, not 2 · x · sin x.
       *
       * A function's argument is written without brackets, so a plain factor
       * *after* one runs straight into it: cos(x)·x printed as "\cos xx",
       * which reads as cos of xx. Textbooks put the plain factor first, so
       * order the product that way — multiplication commutes, so this only
       * changes how it reads.
       */
      let a = e.a;
      let b = e.b;
      if (a.t === 'fn' && b.t !== 'fn') [a, b] = [b, a];
      const left = wrap(a, 2);
      const right = wrap(b, 2);
      // A dot is still needed before a bare number, which would otherwise
      // run into whatever precedes it (x · 2, not x2).
      const glue = b.t === 'num' ? ' \\cdot ' : '';
      return `${left}${glue}${right}`;
    }
    case 'div':
      return `\\dfrac{${toLatex(e.a)}}{${toLatex(e.b)}}`;
    case 'pow': {
      /*
       * A power of a function goes on the function name: sin²x. Printed the
       * other way — "\sin x^{2}" — it reads as sin(x²), which is a different
       * function, so `d/dx tan x` was giving an answer that is simply wrong
       * when read as written.
       */
      if (e.a.t === 'fn' && e.a.name !== 'sqrt' && e.a.name !== 'exp') {
        const f = e.a;
        return `${FN_TEX[f.name] ?? `\\${f.name}`}^{${toLatex(e.b)}} ${fnArg(f.a)}`;
      }
      return `${wrap(e.a, 5)}^{${toLatex(e.b)}}`;
    }
    case 'fn': {
      if (e.name === 'sqrt') return `\\sqrt{${toLatex(e.a)}}`;
      if (e.name === 'exp') return `e^{${toLatex(e.a)}}`;
      return `${FN_TEX[e.name] ?? `\\${e.name}`} ${fnArg(e.a)}`;
    }
  }
}

/** A function's argument: bare when it is a single symbol, bracketed otherwise. */
function fnArg(a: Expr): string {
  return a.t === 'var' || a.t === 'num' ? toLatex(a) : `\\left(${toLatex(a)}\\right)`;
}

/**
 * If `e` is a negative quantity, the same quantity without its sign — so the
 * caller can print a subtraction instead of "+ −".
 */
function withoutSign(e: Expr): Expr | null {
  if (e.t === 'neg') return e.a;
  if (e.t === 'num' && e.v < 0) return num(-e.v);
  // −4 sin x is a product whose leading factor carries the sign.
  if (e.t === 'mul') {
    const left = withoutSign(e.a);
    if (left) return { t: 'mul', a: left, b: e.b };
  }
  return null;
}

/** Does this expression involve x at all? */
export function hasVariable(e: Expr): boolean {
  return !isConstant(e);
}
