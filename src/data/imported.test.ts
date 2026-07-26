import { IMPORTED, SOURCES, sourceOf } from './imported';
import { getSolver } from '../lib/engine/registry';
import { runSolve } from '../lib/engine/run';
import { numbersIn, close } from '../validation/random';

/**
 * Imported questions are a promise: every one is shown to a student as
 * something Longhand can work through. These tests keep that promise, and
 * check the answers against the underlying maths rather than trusting the
 * engine's own output.
 */

describe('imported problems: attribution is complete', () => {
  it('points every problem at a real source', () => {
    for (const p of IMPORTED) {
      expect(SOURCES[p.source], `unknown source "${p.source}" on ${p.label}`).toBeTruthy();
      expect(p.ref, `${p.label} has no section reference`).toBeTruthy();
    }
  });

  it('gives every source the details the licence requires', () => {
    for (const s of Object.values(SOURCES)) {
      expect(s.title).toBeTruthy();
      expect(s.publisher).toBeTruthy();
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.licence).toBeTruthy();
      expect(s.licenceUrl).toMatch(/^https:\/\//);
    }
  });

  it('names a real topic and method for every problem', () => {
    for (const p of IMPORTED) {
      const solver = getSolver(p.solverId);
      expect(solver, `${p.label} points at unknown topic "${p.solverId}"`).toBeTruthy();
      if (p.methodId) {
        expect(
          solver!.methods.some((m) => m.id === p.methodId),
          `${p.label} uses unknown method "${p.methodId}"`,
        ).toBe(true);
      }
    }
  });
});

describe('imported problems: every one actually solves', () => {
  it('produces working for all of them', () => {
    expect(IMPORTED.length).toBeGreaterThan(40);
    for (const p of IMPORTED) {
      const solver = getSolver(p.solverId)!;
      const res = runSolve(solver, p.input, p.methodId ?? solver.defaultMethodId);
      expect(res.ok, `${sourceOf(p).title} ${p.ref} ("${p.input}") failed: ${res.ok ? '' : res.error}`).toBe(true);
      if (res.ok) {
        expect(res.solution.steps.length, `${p.ref} produced no steps`).toBeGreaterThan(0);
      }
    }
  });
});

describe('imported answers: verified against the maths, not the engine', () => {
  it('checks every imported quadratic root by substitution', () => {
    let checked = 0;
    for (const p of IMPORTED.filter((x) => x.solverId === 'quadratics')) {
      const solver = getSolver('quadratics')!;
      const res = runSolve(solver, p.input, p.methodId ?? solver.defaultMethodId);
      if (!res.ok || !res.solution.answerLatex) continue;
      // Surd answers like (4 ± √26)/2 can't be read as a list of roots, so they
      // are covered by the property harness instead, which substitutes the
      // engine's numeric roots back into hundreds of generated quadratics.
      if (res.solution.answerLatex.includes('\\sqrt')) continue;

      // Rebuild the quadratic from the printed problem, independently of the solver.
      const [lhs, rhs = '0'] = p.input.split('=');
      const coeffs = (side: string) => {
        const s = side.replace(/\s+/g, '').replace(/-/g, '+-');
        let a = 0;
        let b = 0;
        let c = 0;
        for (const t of s.split('+').filter(Boolean)) {
          if (t.includes('x^2')) a += num(t.replace('x^2', ''));
          else if (t.includes('x')) b += num(t.replace('x', ''));
          else c += Number(t);
        }
        return [a, b, c];
      };
      const [al, bl, cl] = coeffs(lhs);
      const [ar, br, cr] = coeffs(rhs);
      const [A, B, C] = [al - ar, bl - br, cl - cr];

      for (const r of numbersIn(res.solution.answerLatex)) {
        const residual = A * r * r + B * r + C;
        expect(
          close(residual, 0, 1e-4),
          `${p.ref}: root ${r} of ${p.input} left residual ${residual}`,
        ).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('checks every imported system by substituting back into both equations', () => {
    let checked = 0;
    for (const p of IMPORTED.filter((x) => x.solverId === 'simultaneous')) {
      const solver = getSolver('simultaneous')!;
      const res = runSolve(solver, p.input, p.methodId ?? solver.defaultMethodId);
      if (!res.ok || !res.solution.answerLatex) continue; // degenerate systems have no unique answer
      const [x, y] = numbersIn(res.solution.answerLatex);

      for (const eq of p.input.split(';')) {
        const [lhs, rhs] = eq.split('=');
        const s = lhs.replace(/\s+/g, '').replace(/-/g, '+-');
        let cx = 0;
        let cy = 0;
        let k = 0;
        for (const t of s.split('+').filter(Boolean)) {
          if (t.includes('x')) cx += num(t.replace('x', ''));
          else if (t.includes('y')) cy += num(t.replace('y', ''));
          else k += Number(t);
        }
        const value = cx * x + cy * y + k;
        expect(
          close(value, Number(rhs), 1e-4),
          `${p.ref}: (${x}, ${y}) fails "${eq.trim()}" — got ${value}, wanted ${rhs}`,
        ).toBe(true);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(8);
  });

  it('checks every imported triangle against the law of cosines', () => {
    let checked = 0;
    for (const p of IMPORTED.filter((x) => x.solverId === 'triangle-rules')) {
      const solver = getSolver('triangle-rules')!;
      const res = runSolve(solver, p.input, p.methodId ?? solver.defaultMethodId);
      expect(res.ok, `${p.ref} failed to solve`).toBe(true);
      if (!res.ok || !res.solution.answerLatex) continue;

      const given: Record<string, number> = {};
      for (const m of p.input.matchAll(/([abcABC])\s*=\s*(-?\d*\.?\d+)/g)) {
        given[m[1]] = Number(m[2]);
      }
      const rad = (d: number) => (d * Math.PI) / 180;

      // Some exercises deliberately have no triangle at all; the working says so
      // rather than producing an answer to check.
      if (/no triangle exists/i.test(res.solution.steps.map((s) => s.latex ?? '').join(' '))) continue;

      // Three sides given → the answer is an angle; check with the law of cosines.
      if (given.a !== undefined && given.b !== undefined && given.c !== undefined) {
        const reported = numbersIn(res.solution.answerLatex)[0];
        const expected =
          (Math.acos((given.a ** 2 + given.b ** 2 - given.c ** 2) / (2 * given.a * given.b)) * 180) / Math.PI;
        expect(Math.abs(reported - expected) <= 0.02, `${p.ref}: angle ${reported}, expected ${expected}`).toBe(true);
        checked++;
        continue;
      }
      // Two sides and the included angle → the answer is the third side.
      for (const [side, ang] of [['c', 'C'], ['a', 'A'], ['b', 'B']] as const) {
        const others = (['a', 'b', 'c'] as const).filter((k) => k !== side);
        if (given[side] === undefined && given[ang] !== undefined && others.every((k) => given[k] !== undefined)) {
          const [x, y] = others.map((k) => given[k]);
          const expected = Math.sqrt(x * x + y * y - 2 * x * y * Math.cos(rad(given[ang])));
          const reported = numbersIn(res.solution.answerLatex)[0];
          expect(
            Math.abs(reported - expected) <= 0.02,
            `${p.ref}: side ${reported}, expected ${expected}`,
          ).toBe(true);
          checked++;
          break;
        }
      }
    }
    // The SSA exercises are sine-rule problems and one has no triangle at all,
    // so they are excluded above; the rest are all checked.
    expect(checked).toBeGreaterThanOrEqual(15);
  });
});

/** Read a coefficient that may be empty, "+", "-" or a number. */
function num(s: string): number {
  if (s === '' || s === '+') return 1;
  if (s === '-') return -1;
  return Number(s);
}
