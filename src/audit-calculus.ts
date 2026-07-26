import { parseExpr, differentiate, simplify, toLatex, isConstant, type Expr } from './lib/math/expr';
import { differentiationSolver } from './solvers/calculus/differentiate';

/* ------------------------------------------------- my own AST evaluator */
function ev(e: Expr, x: number): number {
  switch (e.t) {
    case 'num': return e.v;
    case 'var': return e.name === 'e' ? Math.E : x;
    case 'add': return ev(e.a, x) + ev(e.b, x);
    case 'sub': return ev(e.a, x) - ev(e.b, x);
    case 'mul': return ev(e.a, x) * ev(e.b, x);
    case 'div': return ev(e.a, x) / ev(e.b, x);
    case 'pow': return Math.pow(ev(e.a, x), ev(e.b, x));
    case 'neg': return -ev(e.a, x);
    case 'fn': {
      const v = ev(e.a, x);
      switch (e.name) {
        case 'sin': return Math.sin(v);
        case 'cos': return Math.cos(v);
        case 'tan': return Math.tan(v);
        case 'sec': return 1 / Math.cos(v);
        case 'ln': return Math.log(v);
        case 'log': return Math.log10(v);
        case 'exp': return Math.exp(v);
        case 'sqrt': return Math.sqrt(v);
      }
    }
  }
}

/* ------------------------------------------- independent LaTeX evaluator */
/** Evaluate a LaTeX string numerically. Reads it the way a maths reader would. */
function evalLatex(src: string, x: number): number {
  let s = src
    .replace(/\\left|\\right/g, '')
    .replace(/\\dfrac|\\tfrac|\\frac/g, '\\frac')
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\,|\\;|\\quad|\\!/g, ' ')
    .replace(/\\text\{[^}]*\}/g, ' ');
  let i = 0;
  const skip = () => { while (i < s.length && s[i] === ' ') i++; };
  const at = (t: string) => { skip(); return s.startsWith(t, i); };
  const take = (t: string) => { if (at(t)) { i += t.length; return true; } return false; };

  function group(): number {
    skip();
    if (s[i] === '{') {
      let d = 0, j = i;
      for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}') { d--; if (d === 0) break; } }
      const inner = s.slice(i + 1, j);
      i = j + 1;
      return evalLatex(inner, x);
    }
    return atom();
  }

  function expr(): number {
    let v = term();
    for (;;) {
      skip();
      if (take('+')) v += term();
      else if (take('-')) v -= term();
      else return v;
    }
  }
  function term(): number {
    let v = unary();
    for (;;) {
      skip();
      if (take('*')) v *= unary();
      else if (take('/')) v /= unary();
      else if (startsAtom()) v *= unary();
      else return v;
    }
  }
  function startsAtom(): boolean {
    skip();
    if (i >= s.length) return false;
    const c = s[i];
    return /[A-Za-z0-9.(]/.test(c) || c === '\\' || c === '{';
  }
  function unary(): number {
    skip();
    if (take('-')) return -unary();
    if (take('+')) return unary();
    return power();
  }
  function power(): number {
    const b = atom();
    skip();
    if (take('^')) return Math.pow(b, unary());
    return b;
  }
  function atom(): number {
    skip();
    if (i >= s.length) throw new Error('latex ends early');
    if (s[i] === '(') { i++; const v = expr(); skip(); if (s[i] === ')') i++; else throw new Error('latex missing )'); return v; }
    if (s[i] === '{') return group();
    if (s[i] === '\\') {
      if (take('\\frac')) { const a = group(); const b = group(); return a / b; }
      if (take('\\sqrt')) return Math.sqrt(group());
      const fns: [string, (v: number) => number][] = [
        ['\\sin', Math.sin], ['\\cos', Math.cos], ['\\tan', Math.tan],
        ['\\sec', (v) => 1 / Math.cos(v)], ['\\ln', Math.log], ['\\log', Math.log10],
      ];
      for (const [tok, f] of fns) if (take(tok)) return f(power());
      throw new Error(`latex: unknown macro at "${s.slice(i, i + 12)}"`);
    }
    if (/[0-9.]/.test(s[i])) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; const v = Number(s.slice(i, j)); i = j; return v; }
    if (/[A-Za-z]/.test(s[i])) { const c = s[i]; i++; return c === 'e' ? Math.E : x; }
    throw new Error(`latex: unexpected "${s[i]}"`);
  }

  const v = expr();
  skip();
  if (i < s.length) throw new Error(`latex: leftover "${s.slice(i)}"`);
  return v;
}

/* --------------------------------------------------------------- checks */
const XS = [0.3, 0.7, 1.3, 2.1, -0.6, 3.4];
const H = 1e-5;

function close(a: number, b: number, tol = 2e-4): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Compare a numeric derivative-function against central differences of f. */
function checkDeriv(f: (x: number) => number, d: (x: number) => number): string | null {
  let tested = 0;
  for (const x of XS) {
    const fp = f(x + H), fm = f(x - H), fc = f(x);
    if (![fp, fm, fc].every(Number.isFinite)) continue;
    const fd = (fp - fm) / (2 * H);
    let got: number;
    try { got = d(x); } catch (err) { return `eval failed at x=${x}: ${(err as Error).message}`; }
    if (!Number.isFinite(got)) continue;
    tested++;
    if (!close(got, fd, 1e-3)) return `x=${x}: got ${got.toPrecision(8)}, finite-difference ${fd.toPrecision(8)}`;
  }
  return tested === 0 ? 'no testable points' : null;
}

const stripLead = (s: string) => s.replace(/^\s*(f'\(x\)|dy\/dx|y'|\\frac\{dy\}\{dx\}|\\dfrac\{dy\}\{dx\})\s*=\s*/, '');

/* ================================================ 1. expression-engine core */
console.log('=== A. core: parseExpr -> differentiate, vs finite differences ===');
const exprCases = [
  'x^3 - 4x^2 + 2x - 7', 'x^2 sin(3x)', '(2x+1)^5 / x', 'e^(x^2)', 'ln(3x+1)',
  '1/x', 'sqrt(x)', '5', 'x^(-2)', 'x^(1/2)', 'x^0', '3x^-1', 'sin(x)cos(x)',
  'tan(2x)', 'exp(3x)', 'ln(x^2)', 'x/(x+1)', '(x^2+1)^3', 'sin(x^2)',
  '2^x', 'x^x', 'sqrt(3x+2)', '1/(x^2+1)', '5x', 'x sin x', 'cos(3x)^2',
  'ln(x)/x', 'x^2 e^x', '(x-1)(x+2)', '3/x^2', 'x^1.5', '-x^2', 'log(x)',
];
for (const src of exprCases) {
  let e: Expr;
  try { e = parseExpr(src); } catch (err) { console.log(`  PARSE-FAIL  ${src.padEnd(18)} ${(err as Error).message}`); continue; }
  let d: Expr;
  try { d = simplify(differentiate(e)); } catch (err) { console.log(`  DIFF-FAIL   ${src.padEnd(18)} ${(err as Error).message}`); continue; }
  const bad = checkDeriv((x) => ev(e, x), (x) => ev(d, x));
  const tex = toLatex(d);
  let texBad: string | null = null;
  for (const x of XS) {
    const truth = ev(d, x);
    if (!Number.isFinite(truth)) continue;
    let got: number;
    try { got = evalLatex(tex, x); } catch (err) { texBad = `render unreadable: ${(err as Error).message}`; break; }
    if (Number.isFinite(got) && !close(got, truth)) { texBad = `x=${x}: latex reads as ${got.toPrecision(8)}, tree is ${truth.toPrecision(8)}`; break; }
  }
  const flag = bad ? 'MATH-WRONG' : texBad ? 'RENDER' : 'ok';
  if (flag !== 'ok') console.log(`  ${flag.padEnd(11)} ${src.padEnd(18)} -> ${tex}\n              ${bad ?? texBad}`);
  else console.log(`  ok          ${src.padEnd(18)} -> ${tex}`);
}

/* ============================================== 2. solver path, all methods */
console.log('\n=== B. differentiate solver, per method, vs finite differences ===');
const solverCases: [string, string][] = [];
for (const src of ['x^3 - 4x^2 + 2x - 7', 'x^2 sin(3x)', '(2x+1)^5 / x', 'ln(3x+1)', '1/x', 'sqrt(x)', '5', 'x^(-2)', 'x^(1/2)', 'sin(x)cos(x)', '(x^2+1)^3', 'x/(x+1)', 'x^2 e^x', 'e^(3x)', '2x^3 + x', 'x^0', '-3x^2 + 5'])
  for (const m of ['power', 'rules', 'first-principles']) solverCases.push([src, m]);
for (const [src, m] of solverCases) {
  const r = differentiationSolver.solve(src, m);
  if (!r.ok) { console.log(`  FAIL   [${m}] ${src.padEnd(18)} ${r.error}`); continue; }
  const tex = stripLead(r.solution.answerLatex ?? '');
  let f: (x: number) => number;
  try { const e = parseExpr(src); f = (x) => ev(e, x); } catch { continue; }
  const bad = checkDeriv(f, (x) => evalLatex(tex, x));
  console.log(`  ${(bad ? 'WRONG' : 'ok').padEnd(6)} [${m}] ${src.padEnd(18)} -> ${tex}${bad ? `\n           ${bad}` : ''}`);
}

console.log('\nisConstant(e) =', isConstant(parseExpr('e')), ' isConstant(2^x) =', isConstant(parseExpr('2^x')));
