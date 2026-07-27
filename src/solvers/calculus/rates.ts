import { fmt, parseParams } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Rates of change and differential equations (SACE Stage 2 Specialist):
 * exponential growth and decay, Newton's law of cooling, and separable
 * equations of the form dy/dx = k·y.
 */

interface Growth {
  k?: number; // continuous rate
  initial?: number; // value at t = 0
  t?: number; // time to evaluate at
  target?: number; // value we want to reach
  halfLife?: number;
  doubling?: number;
}

function read(input: string): Growth {
  const p = parseParams(input);
  const g: Growth = {
    k: p.k,
    initial: p.initial ?? p.a ?? p.n0 ?? p.p ?? p.y0,
    t: p.t ?? p.time,
    target: p.target ?? p.y,
    halfLife: p.halflife ?? p.half,
    doubling: p.doubling,
  };

  const half = input.match(/half[\s-]?life\s*(?:of|is|=)?\s*(-?\d*\.?\d+)/i);
  if (half) g.halfLife = Number(half[1]);
  const dbl = input.match(/doubling\s*(?:time)?\s*(?:of|is|=)?\s*(-?\d*\.?\d+)/i);
  if (dbl) g.doubling = Number(dbl[1]);

  // Natural phrasings that carry a value without an equals sign.
  const init = input.match(
    /(?:initial(?:ly)?|starting|starts?\s+(?:at|with)|begins?\s+with)\s*(?:amount|value|population|mass)?\s*(?:of|is|at|=)?\s*(-?\d*\.?\d+)/i,
  );
  if (init && g.initial === undefined) g.initial = Number(init[1]);

  /*
   * Students state the starting amount as the subject of the sentence far
   * more often than they label it: "a population of 500 grows at 5% per
   * year", "500 bacteria grow at 5% per hour". Neither matched, so the
   * solver fell back to y₀ = 100 and answered 164.87 for a question whose
   * answer is 824.36 — a plausible number for a question nobody asked.
   *
   * Every other quantity has already been read above, and each is introduced
   * by a word or a percent sign. So the starting amount is the first number
   * in the sentence that none of them claimed.
   */
  if (g.initial === undefined) {
    const CLAIMED = /(?:%|per|after|for|t\s*=|k\s*=|half[\s-]?life|doubling|target|reaches?|drops?|falls?|grows?\s+to|down\s+to)/i;
    for (const m of input.matchAll(/(-?\d*\.?\d+)/g)) {
      const before = input.slice(Math.max(0, m.index - 14), m.index);
      const after = input.slice(m.index + m[0].length, m.index + m[0].length + 2);
      if (CLAIMED.test(before) || after.trimStart().startsWith('%')) continue;
      g.initial = Number(m[1]);
      break;
    }
  }

  const after = input.match(/after\s*(-?\d*\.?\d+)/i);
  if (after && g.t === undefined) g.t = Number(after[1]);

  const tgt = input.match(/(?:target|reaches?|drops?\s+to|falls?\s+to|grows?\s+to|down\s+to)\s*(?:of|is|=)?\s*(-?\d*\.?\d+)/i);
  if (tgt && g.target === undefined) g.target = Number(tgt[1]);

  // "grows at 5% per year" / "decays at 3% per hour"
  const pct = input.match(/(-?\d*\.?\d+)\s*%\s*(?:per|a|each)?/i);
  if (pct && g.k === undefined) {
    const rate = Number(pct[1]) / 100;
    g.k = /decay|decreas|depreciat|cool|shrink|fall/i.test(input) ? -rate : rate;
  }
  return g;
}

export const ratesSolver: Solver = {
  id: 'rates',
  title: 'Growth, decay & rates',
  subjects: ['Specialist', 'Methods'],
  blurb: 'Exponential growth and decay, half-life, and dy/dt = ky.',
  placeholder: 'e.g.  half-life 5730, initial 100, t=10000',
  methods: [
    { id: 'exponential', name: 'Exponential model', blurb: 'Solve dy/dt = ky to get y = y₀e^{kt}, then substitute.' },
    { id: 'half-life', name: 'Half-life / doubling', blurb: 'Find the constant k from a half-life or doubling time first.' },
  ],
  defaultMethodId: 'exponential',
  detect(input) {
    const l = input.toLowerCase();
    const strong = /half[\s-]?life|doubling|exponential (growth|decay)|dy\/dt|dy\/dx\s*=\s*k|radioactive|carbon[\s-]?dating/.test(l);
    if (strong) return 0.95;
    if (/(growth|decay|grows|decays)/.test(l) && /%|k\s*=/.test(l)) return 0.85;
    return 0;
  },
  solve(input): SolveResult {
    const g = read(input);
    const steps: Step[] = [
      {
        note: 'When something changes at a rate proportional to its size, the model is a separable differential equation.',
        latex: `\\dfrac{dy}{dt} = ky`,
      },
      {
        note: 'Separate the variables and integrate both sides.',
        latex: `\\int \\dfrac{1}{y}\\,dy = \\int k\\,dt \\;\\Rightarrow\\; \\ln|y| = kt + c`,
      },
      {
        note: 'Make $y$ the subject. The constant becomes the starting value $y_0$.',
        latex: `y = y_{0}e^{kt}`,
        annotation: 'the general solution',
      },
    ];

    // Recover k from a half-life or doubling time when that is what was given.
    let k = g.k;
    if (g.halfLife !== undefined && g.halfLife > 0) {
      k = -Math.LN2 / g.halfLife;
      steps.push({
        note: 'A half-life means the amount falls to one half, so substitute $y = \\tfrac{1}{2}y_0$ and solve for $k$.',
        latex: `\\tfrac{1}{2} = e^{k \\times ${fmt(g.halfLife, 6)}} \\;\\Rightarrow\\; k = \\dfrac{-\\ln 2}{${fmt(g.halfLife, 6)}} = ${fmt(k, 8)}`,
        annotation: 'k is negative — decay',
      });
    } else if (g.doubling !== undefined && g.doubling > 0) {
      k = Math.LN2 / g.doubling;
      steps.push({
        note: 'A doubling time means the amount reaches twice its size, so substitute $y = 2y_0$.',
        latex: `2 = e^{k \\times ${fmt(g.doubling, 6)}} \\;\\Rightarrow\\; k = \\dfrac{\\ln 2}{${fmt(g.doubling, 6)}} = ${fmt(k, 8)}`,
        annotation: 'k is positive — growth',
      });
    }

    if (k === undefined) {
      return {
        ok: false,
        error: 'Give a rate (k=0.05 or 5%), a half-life, or a doubling time — e.g.  half-life 5730, initial 100, t=10000.',
      };
    }

    const y0 = g.initial ?? 100;
    if (g.initial === undefined) {
      steps.push({
        note: 'No starting amount was given, so work in percentages of the original by taking $y_0 = 100$.',
        latex: `y_{0} = 100`,
        annotation: 'assumed',
      });
    }

    steps.push({
      note: 'Write the particular model for this situation.',
      latex: `y = ${fmt(y0)}e^{${fmt(k, 8)}t}`,
      annotation: 'the model',
    });

    let answer: string | undefined;

    if (g.t !== undefined) {
      const y = y0 * Math.exp(k * g.t);
      steps.push({
        note: `Substitute $t = ${fmt(g.t)}$.`,
        latex: `y = ${fmt(y0)}e^{${fmt(k, 8)} \\times ${fmt(g.t)}} = ${fmt(y0)}e^{${fmt(k * g.t, 6)}}`,
      });
      steps.push({
        note: 'Work it out.',
        latex: `y = ${fmt(y, 4)}`,
        annotation: `${fmt((y / y0) * 100, 2)}% of the original`,
      });
      answer = `y = ${fmt(y, 4)}`;
    } else if (g.target !== undefined && g.target > 0 && y0 > 0) {
      const t = Math.log(g.target / y0) / k;
      steps.push({
        note: `Set $y = ${fmt(g.target)}$ and solve for $t$ by taking natural logs.`,
        latex: `${fmt(g.target)} = ${fmt(y0)}e^{${fmt(k, 8)}t} \\;\\Rightarrow\\; t = \\dfrac{\\ln\\left(${fmt(g.target / y0, 6)}\\right)}{${fmt(k, 8)}}`,
      });
      steps.push({ note: 'Work it out.', latex: `t = ${fmt(t, 4)}`, annotation: 'time taken' });
      answer = `t = ${fmt(t, 4)}`;
    } else {
      steps.push({
        note: 'Add a time (t=10) or a target amount (target=25) to get a number out of the model.',
        latex: `y = ${fmt(y0)}e^{${fmt(k, 8)}t}`,
      });
      answer = `y = ${fmt(y0)}e^{${fmt(k, 8)}t}`;
    }

    return {
      ok: true,
      solution: {
        headline: 'Solve the growth/decay model',
        methodName: g.halfLife !== undefined || g.doubling !== undefined ? 'Half-life / doubling' : 'Exponential model',
        steps,
        answerLatex: answer,
      },
    };
  },
};
