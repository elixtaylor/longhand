import { fmt, rad2deg } from '../../lib/math/num';
import type { Solver, SolveResult } from '../../lib/engine/types';

/**
 * Complex numbers (SACE Stage 1 Topic 6 / Stage 2 Specialist Topic 2):
 * arithmetic in rectangular form, conjugates, modulus, argument and polar form.
 */
interface Cx {
  re: number;
  im: number;
}

const C = (re: number, im: number): Cx => ({ re, im });

/** Render a + bi, tidying signs and unit coefficients. */
function cxTex(z: Cx, dp = 4): string {
  const re = fmt(z.re, dp);
  const im = Math.abs(z.im);
  if (Math.abs(z.im) < 1e-12) return re;
  const imPart = Math.abs(im - 1) < 1e-12 ? 'i' : `${fmt(im, dp)}i`;
  if (Math.abs(z.re) < 1e-12) return z.im < 0 ? `-${imPart}` : imPart;
  return `${re} ${z.im < 0 ? '-' : '+'} ${imPart}`;
}

/**
 * Parse "3+4i", "-2i", "5", "3 - 4i".
 *
 * Splits into signed tokens rather than scanning with a /g regex: a pattern
 * whose parts are all optional can match the empty string, and `exec` does not
 * advance past a zero-length match, which spins forever at end of input.
 */
function parseCx(sRaw: string): Cx {
  const s = sRaw.replace(/\s+/g, '').replace(/^\(|\)$/g, '');
  if (s === '') throw new Error('Empty complex number.');

  const tokens = s.match(/[+-]?[^+-]+/g);
  if (!tokens || tokens.join('') !== s) throw new Error(`Could not read "${sRaw}".`);

  let re = 0;
  let im = 0;
  for (const token of tokens) {
    const isImag = token.endsWith('i');
    let numStr = isImag ? token.slice(0, -1) : token;
    if (numStr === '' || numStr === '+') numStr = '1';
    else if (numStr === '-') numStr = '-1';
    const num = Number(numStr);
    if (!Number.isFinite(num)) throw new Error(`Could not read "${sRaw}".`);
    if (isImag) im += num;
    else re += num;
  }
  return C(re, im);
}

interface Problem {
  op: '+' | '-' | '*' | '/' | 'modulus' | 'conjugate' | 'polar';
  a: Cx;
  b?: Cx;
}

function parse(input: string): Problem {
  const s = input.replace(/\s+/g, '');

  const mod = s.match(/^\|(.+)\|$/) ?? s.match(/^(?:mod|modulus)\(?(.+?)\)?$/i);
  if (mod) return { op: 'modulus', a: parseCx(mod[1]) };

  const conj = s.match(/^(?:conj|conjugate)\(?(.+?)\)?$/i);
  if (conj) return { op: 'conjugate', a: parseCx(conj[1]) };

  const pol = s.match(/^(?:polar|arg|argument|modarg)\(?(.+?)\)?$/i);
  if (pol) return { op: 'polar', a: parseCx(pol[1]) };

  // Two bracketed complex numbers joined by an operation.
  const bin = s.match(/^\(([^()]+)\)([+\-*×/÷])\(([^()]+)\)$/);
  if (bin) {
    const opMap: Record<string, Problem['op']> = { '+': '+', '-': '-', '*': '*', '×': '*', '/': '/', '÷': '/' };
    return { op: opMap[bin[2]], a: parseCx(bin[1]), b: parseCx(bin[3]) };
  }

  throw new Error('Try  (3+4i)*(1-2i),  |3+4i|,  conj(3+4i)  or  polar 3+4i.');
}

export const complexSolver: Solver = {
  id: 'complex',
  title: 'Complex numbers',
  subjects: ['Specialist'],
  blurb: 'Arithmetic, conjugates, modulus, argument and polar form.',
  placeholder: 'e.g.  (3+4i)*(1-2i)   or   polar 3+4i',
  methods: [
    {
      id: 'rectangular',
      name: 'Rectangular form',
      blurb: 'Work in a + bi, using i² = −1 and the conjugate for division.',
      opForm: 'complex',
    },
    {
      id: 'polar',
      name: 'Polar form',
      blurb: 'Write as r cis θ with modulus and argument.',
      opForm: 'complex',
    },
  ],
  defaultMethodId: 'rectangular',
  detect(input) {
    if (!/i/.test(input)) return 0;
    try {
      parse(input);
      return 0.96;
    } catch {
      return 0;
    }
  },
  solve(input, methodId): SolveResult {
    let p: Problem;
    try {
      p = parse(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that.' };
    }
    const { a, b } = p;

    // Polar form of a single number — also the "polar" method on any input.
    if (p.op === 'polar' || (methodId === 'polar' && !b)) {
      const r = Math.hypot(a.re, a.im);
      const argRad = Math.atan2(a.im, a.re);
      const argDeg = rad2deg(argRad);
      return {
        ok: true,
        solution: {
          headline: `Write $${cxTex(a)}$ in polar form`,
          methodName: 'Polar form',
          steps: [
            { note: 'Plot the number: the real part is across, the imaginary part is up.', latex: `z = ${cxTex(a)}` },
            {
              note: 'The modulus is the distance from the origin (Pythagoras).',
              latex: `r = |z| = \\sqrt{${fmt(a.re)}^{2} + ${fmt(a.im)}^{2}} = ${fmt(r, 4)}`,
            },
            {
              note: 'The argument is the angle from the positive real axis.',
              latex: `\\theta = \\tan^{-1}\\!\\left(\\dfrac{${fmt(a.im)}}{${fmt(a.re)}}\\right) = ${fmt(argDeg, 4)}^{\\circ} = ${fmt(argRad, 4)}\\text{ rad}`,
              annotation: 'check the quadrant',
            },
            {
              note: 'Put it together in polar (mod–arg) form.',
              latex: `z = ${fmt(r, 4)}\\left(\\cos ${fmt(argDeg, 2)}^{\\circ} + i\\sin ${fmt(argDeg, 2)}^{\\circ}\\right) = ${fmt(r, 4)}\\,\\text{cis}\\,${fmt(argDeg, 2)}^{\\circ}`,
              annotation: 'polar form',
            },
          ],
          answerLatex: `${fmt(r, 4)}\\,\\text{cis}\\,${fmt(argDeg, 2)}^{\\circ}`,
        },
      };
    }

    if (p.op === 'modulus') {
      const r = Math.hypot(a.re, a.im);
      return {
        ok: true,
        solution: {
          headline: `Find $|${cxTex(a)}|$`,
          methodName: 'Modulus',
          steps: [
            { note: 'The modulus is the distance from the origin on the complex plane.', latex: `|a + bi| = \\sqrt{a^{2} + b^{2}}` },
            { note: 'Substitute the real and imaginary parts.', latex: `|z| = \\sqrt{${fmt(a.re)}^{2} + ${fmt(a.im)}^{2}} = \\sqrt{${fmt(a.re * a.re + a.im * a.im)}}` },
            { note: 'Work it out.', latex: `|z| = ${fmt(r, 4)}`, annotation: 'modulus' },
          ],
          answerLatex: `|z| = ${fmt(r, 4)}`,
        },
      };
    }

    if (p.op === 'conjugate') {
      const conj = C(a.re, -a.im);
      return {
        ok: true,
        solution: {
          headline: `Find the conjugate of $${cxTex(a)}$`,
          methodName: 'Conjugate',
          steps: [
            { note: 'The conjugate flips the sign of the imaginary part.', latex: `\\overline{a + bi} = a - bi` },
            { note: 'Apply it.', latex: `\\overline{${cxTex(a)}} = ${cxTex(conj)}`, annotation: 'conjugate' },
          ],
          answerLatex: cxTex(conj),
        },
      };
    }

    if (!b) return { ok: false, error: 'That operation needs two complex numbers.' };

    if (p.op === '+' || p.op === '-') {
      const sign = p.op === '+' ? 1 : -1;
      const out = C(a.re + sign * b.re, a.im + sign * b.im);
      return {
        ok: true,
        solution: {
          headline: `Work out $(${cxTex(a)}) ${p.op} (${cxTex(b)})$`,
          methodName: p.op === '+' ? 'Addition' : 'Subtraction',
          steps: [
            { note: `Collect the real parts and the imaginary parts separately.`, latex: `(${cxTex(a)}) ${p.op} (${cxTex(b)})` },
            {
              note: 'Group them.',
              latex: `= (${fmt(a.re)} ${p.op} ${fmt(b.re)}) + (${fmt(a.im)} ${p.op} ${fmt(b.im)})i`,
            },
            { note: 'Simplify.', latex: `= ${cxTex(out)}`, annotation: 'answer' },
          ],
          answerLatex: cxTex(out),
        },
      };
    }

    if (p.op === '*') {
      const out = C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
      return {
        ok: true,
        solution: {
          headline: `Work out $(${cxTex(a)})(${cxTex(b)})$`,
          methodName: 'Multiplication',
          steps: [
            { note: 'Expand the brackets as usual.', latex: `(${cxTex(a)})(${cxTex(b)})` },
            {
              note: 'Multiply every term by every term.',
              latex: `= ${fmt(a.re)}\\times${fmt(b.re)} + ${fmt(a.re)}\\times${fmt(b.im)}i + ${fmt(a.im)}i\\times${fmt(b.re)} + ${fmt(a.im)}i\\times${fmt(b.im)}i`,
            },
            {
              note: 'Replace $i^{2}$ with $-1$.',
              latex: `= ${fmt(a.re * b.re)} + ${fmt(a.re * b.im)}i + ${fmt(a.im * b.re)}i ${a.im * b.im >= 0 ? '-' : '+'} ${fmt(Math.abs(a.im * b.im))}`,
              annotation: 'i² = −1',
            },
            { note: 'Collect real and imaginary parts.', latex: `= ${cxTex(out)}`, annotation: 'answer' },
          ],
          answerLatex: cxTex(out),
        },
      };
    }

    // Division by the conjugate.
    const denom = b.re * b.re + b.im * b.im;
    if (denom === 0) return { ok: false, error: 'You can’t divide by zero.' };
    const conj = C(b.re, -b.im);
    const numRe = a.re * b.re + a.im * b.im;
    const numIm = a.im * b.re - a.re * b.im;
    const out = C(numRe / denom, numIm / denom);
    return {
      ok: true,
      solution: {
        headline: `Work out $\\dfrac{${cxTex(a)}}{${cxTex(b)}}$`,
        methodName: 'Division by the conjugate',
        steps: [
          { note: 'Write it as a fraction.', latex: `\\dfrac{${cxTex(a)}}{${cxTex(b)}}` },
          {
            note: 'Multiply top and bottom by the conjugate of the denominator — that makes the bottom real.',
            latex: `= \\dfrac{(${cxTex(a)})(${cxTex(conj)})}{(${cxTex(b)})(${cxTex(conj)})}`,
            annotation: 'realise the denominator',
          },
          {
            note: 'The denominator becomes $a^{2} + b^{2}$.',
            latex: `= \\dfrac{${cxTex(C(numRe, numIm))}}{${fmt(b.re)}^{2} + ${fmt(b.im)}^{2}} = \\dfrac{${cxTex(C(numRe, numIm))}}{${fmt(denom)}}`,
          },
          { note: 'Divide each part by the denominator.', latex: `= ${cxTex(out)}`, annotation: 'answer' },
        ],
        answerLatex: cxTex(out),
      },
    };
  },
};
