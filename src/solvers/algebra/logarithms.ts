import { fmt } from '../../lib/math/num';
import type { Solver, Step, SolveResult } from '../../lib/engine/types';

/**
 * Logarithmic and exponential equations
 * (SACE Stage 2 Mathematical Methods, Topic 4).
 */
type Problem =
  | { kind: 'exponential'; coeff: number; base: number | 'e'; mult: number; value: number }
  | { kind: 'evaluate'; base: number | 'e'; value: number }
  | { kind: 'log-equation'; base: number | 'e'; value: number };

const clean = (s: string) => s.replace(/\s+/g, '');

function parse(inputRaw: string): Problem {
  const s = clean(inputRaw);

  // b^x = c, optionally with a coefficient and a multiple of x: 5*2^(3x)=40
  const exp = s.match(/^(?:(\d*\.?\d+)[*×])?(\d*\.?\d+|e)\^\(?(\d*\.?\d+)?x\)?=(-?\d*\.?\d+)$/i);
  if (exp) {
    return {
      kind: 'exponential',
      coeff: exp[1] ? Number(exp[1]) : 1,
      base: exp[2].toLowerCase() === 'e' ? 'e' : Number(exp[2]),
      mult: exp[3] ? Number(exp[3]) : 1,
      value: Number(exp[4]),
    };
  }

  // log_b(x) = c  /  ln(x) = c   → solve for x
  const logEq = s.match(/^(?:log_?(\d*\.?\d+)?|ln)\(?x\)?=(-?\d*\.?\d+)$/i);
  if (logEq) {
    const isLn = /^ln/i.test(s);
    return {
      kind: 'log-equation',
      base: isLn ? 'e' : logEq[1] ? Number(logEq[1]) : 10,
      value: Number(logEq[2]),
    };
  }

  // log_b(c) / log(c) / ln(c) → evaluate
  const evalLog = s.match(/^(?:log_?(\d*\.?\d+)?|ln)\(?(\d*\.?\d+)\)?$/i);
  if (evalLog) {
    const isLn = /^ln/i.test(s);
    return {
      kind: 'evaluate',
      base: isLn ? 'e' : evalLog[1] ? Number(evalLog[1]) : 10,
      value: Number(evalLog[2]),
    };
  }

  throw new Error('Try  2^x = 32,  log2(32),  or  ln x = 2.');
}

const baseTex = (b: number | 'e') => (b === 'e' ? 'e' : fmt(b));
const logName = (b: number | 'e') => (b === 'e' ? '\\ln' : b === 10 ? '\\log' : `\\log_{${fmt(b)}}`);
const lnOf = (b: number | 'e') => (b === 'e' ? 1 : Math.log(b));

/** Is `value` a neat whole power of `base`? Then the answer is exact. */
function exactPower(base: number, value: number): number | null {
  if (base <= 0 || base === 1 || value <= 0) return null;
  const p = Math.log(value) / Math.log(base);
  const r = Math.round(p);
  return Math.abs(p - r) < 1e-10 && Math.abs(Math.pow(base, r) - value) < 1e-9 ? r : null;
}

function solveExponential(p: Extract<Problem, { kind: 'exponential' }>, methodId: string): SolveResult {
  const { coeff, base, mult, value } = p;
  const bNum = base === 'e' ? Math.E : base;
  const rhs = value / coeff;

  const original = `${coeff === 1 ? '' : `${fmt(coeff)} \\times `}${baseTex(base)}^{${mult === 1 ? 'x' : `${fmt(mult)}x`}} = ${fmt(value)}`;
  const steps: Step[] = [{ note: 'Write down the equation.', latex: original }];

  if (rhs <= 0) {
    return { ok: false, error: `A positive base can never give ${fmt(rhs)}, so there is no solution.` };
  }
  if (coeff !== 1) {
    steps.push({
      note: `Divide both sides by ${fmt(coeff)} to get the power on its own.`,
      latex: `${baseTex(base)}^{${mult === 1 ? 'x' : `${fmt(mult)}x`}} = ${fmt(rhs, 6)}`,
    });
  }

  const power = base === 'e' ? null : exactPower(bNum, rhs);

  // Rewriting both sides to the same base is neater when the answer is exact.
  if (power !== null && methodId !== 'logs') {
    steps.push({
      note: `Write the right-hand side as a power of ${fmt(bNum)}.`,
      latex: `${baseTex(base)}^{${mult === 1 ? 'x' : `${fmt(mult)}x`}} = ${fmt(bNum)}^{${power}}`,
      annotation: `${fmt(bNum)}^${power} = ${fmt(rhs)}`,
    });
    steps.push({
      note: 'The bases match, so the indices must be equal.',
      latex: mult === 1 ? `x = ${power}` : `${fmt(mult)}x = ${power}`,
    });
    if (mult !== 1) {
      steps.push({ note: `Divide by ${fmt(mult)}.`, latex: `x = ${fmt(power / mult, 6)}` });
    }
    const x = power / mult;
    return {
      ok: true,
      solution: {
        headline: `Solve $${original}$`,
        methodName: 'Equating indices',
        steps,
        answerLatex: `x = ${fmt(x, 6)}`,
      },
    };
  }

  // General case: take logarithms of both sides.
  const x = Math.log(rhs) / (lnOf(base) * mult);
  steps.push({
    note: 'Take logarithms of both sides so the power can come down.',
    latex: `${logName('e')}\\left(${baseTex(base)}^{${mult === 1 ? 'x' : `${fmt(mult)}x`}}\\right) = ${logName('e')}(${fmt(rhs, 6)})`,
  });
  steps.push({
    note: 'Use the power law $\\log(a^{n}) = n\\log a$ to bring the index down.',
    latex: `${mult === 1 ? 'x' : `${fmt(mult)}x`} \\times ${logName('e')}(${baseTex(base)}) = ${logName('e')}(${fmt(rhs, 6)})`,
    annotation: 'power law',
  });
  steps.push({
    note: `Divide both sides by $${mult === 1 ? '' : `${fmt(mult)}`}${logName('e')}(${baseTex(base)})$ to make $x$ the subject.`,
    latex: `x = \\dfrac{${logName('e')}(${fmt(rhs, 6)})}{${mult === 1 ? '' : `${fmt(mult)} \\times `}${logName('e')}(${baseTex(base)})}`,
  });
  steps.push({
    note: 'Look up the two logarithms.',
    latex: `${logName('e')}(${fmt(rhs, 6)}) = ${fmt(Math.log(rhs), 6)}, \\qquad ${logName('e')}(${baseTex(base)}) = ${fmt(lnOf(base), 6)}`,
  });
  steps.push({
    note: 'Work out the division.',
    latex: `x = \\dfrac{${fmt(Math.log(rhs), 6)}}{${mult === 1 ? '' : `${fmt(mult)} \\times `}${fmt(lnOf(base), 6)}} = ${fmt(x, 6)}`,
    annotation: 'solved',
  });

  return {
    ok: true,
    solution: {
      headline: `Solve $${original}$`,
      methodName: 'Taking logarithms',
      steps,
      answerLatex: `x = ${fmt(x, 6)}`,
    },
  };
}

export const logarithmsSolver: Solver = {
  id: 'logarithms',
  title: 'Logs & exponentials',
  subjects: ['Methods', 'Specialist'],
  blurb: 'Solve exponential equations and evaluate logarithms.',
  placeholder: 'e.g.  2^x = 32   or   log2(32)',
  methods: [
    { id: 'same-base', name: 'Equating indices', blurb: 'Rewrite both sides with the same base, then match the powers. Exact when it works.' },
    { id: 'logs', name: 'Taking logs', blurb: 'Take logarithms of both sides and use the power law. Always works.' },
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
  solve(input, methodId): SolveResult {
    let p: Problem;
    try {
      p = parse(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that.' };
    }

    if (p.kind === 'exponential') return solveExponential(p, methodId);

    if (p.kind === 'log-equation') {
      const { base, value } = p;
      const bNum = base === 'e' ? Math.E : base;
      // Math.pow(Math.E, n) compounds the rounding already in Math.E; Math.exp
      // is computed directly and is what the expression engine uses, so the
      // same question routed two ways gives the same number.
      const x = base === 'e' ? Math.exp(value) : Math.pow(bNum, value);
      const b = baseTex(base);
      const L = logName(base);

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

      return {
        ok: true,
        solution: {
          headline: `Solve $${L} x = ${fmt(value)}$`,
          methodName: 'Converting to index form',
          steps,
          answerLatex: `x = ${fmt(x, 6)}`,
        },
      };
    }

    // Evaluate a logarithm.
    const { base, value } = p;
    const bNum = base === 'e' ? Math.E : base;
    if (value <= 0) {
      return { ok: false, error: 'You can only take the logarithm of a positive number.' };
    }
    const result = Math.log(value) / lnOf(base);
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
      steps.push({ note: 'So the logarithm is that index.', latex: `${logName(base)}(${fmt(value)}) = ${exact}`, annotation: 'answer' });
    } else {
      // One line used to do three things: state the rule, look up both
      // logarithms, and divide. Split so each is checkable on a calculator.
      steps.push({
        note: 'It isn’t a whole power, so use the change-of-base rule to get something a calculator has a button for.',
        latex: `${logName(base)}(${fmt(value)}) = \\dfrac{\\ln ${fmt(value)}}{\\ln ${baseTex(base)}}`,
        annotation: 'change of base',
      });
      steps.push({
        note: 'Look up the two natural logarithms.',
        latex: `\\ln ${fmt(value)} = ${fmt(Math.log(value), 6)}, \\qquad \\ln ${baseTex(base)} = ${fmt(lnOf(base), 6)}`,
      });
      steps.push({
        note: 'Divide one by the other.',
        latex: `${logName(base)}(${fmt(value)}) = \\dfrac{${fmt(Math.log(value), 6)}}{${fmt(lnOf(base), 6)}} = ${fmt(result, 6)}`,
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
