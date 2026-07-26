import type { Solver, Step, SolveResult } from '../../lib/engine/types';
import type { LongDivisionData } from '../../lib/engine/visuals';

function parseDivision(input: string): { n: number; d: number } {
  const cleaned = input.replace(/[÷/]/g, '/').replace(/\s+/g, '');
  const parts = cleaned.split('/');
  if (parts.length !== 2 || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error('Enter two whole numbers to divide, e.g.  864 ÷ 24');
  }
  const n = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  if (d === 0) throw new Error('You can’t divide by zero.');
  return { n, d };
}

/** Walk the digits once, recording the bus-stop carries (shared by short/long). */
function busStop(n: number, d: number): LongDivisionData {
  const dividendDigits = String(n).split('');
  const quotientDigits: string[] = [];
  const carries: (number | null)[] = [];
  let carry = 0;
  for (const ch of dividendDigits) {
    carries.push(carry > 0 ? carry : null);
    const cur = carry * 10 + Number(ch);
    quotientDigits.push(String(Math.floor(cur / d)));
    carry = cur % d;
  }
  return {
    divisor: d,
    dividendDigits,
    quotientDigits,
    carries,
    quotient: Math.floor(n / d),
    remainder: n % d,
  };
}

function remainderNote(r: number): string {
  return r === 0 ? '' : ` \\text{ remainder } ${r}`;
}

/* ------------------------------------------------------- short (bus-stop) */
function solveShort(n: number, d: number): SolveResult {
  const data = busStop(n, d);
  const steps: Step[] = [
    {
      note: 'Write it as a “bus stop”: the number goes inside, the divisor outside. Work left to right, carrying each remainder to the next digit.',
      visual: { kind: 'long-division', data },
    },
  ];

  let carry = 0;
  data.dividendDigits.forEach((ch, i) => {
    const cur = carry * 10 + Number(ch);
    const q = Math.floor(cur / d);
    carry = cur % d;
    steps.push({
      note: `Divide ${cur} by ${d}.`,
      latex: `${cur} \\div ${d} = ${q}${carry > 0 ? ` \\text{ r } ${carry}` : ''}`,
      annotation: i < data.dividendDigits.length - 1 && carry > 0 ? `carry the ${carry}` : undefined,
    });
  });

  steps.push({
    note: 'Read the answer off the top.',
    latex: `${n} \\div ${d} = ${data.quotient}${remainderNote(data.remainder)}`,
    annotation: 'answer',
  });

  return {
    ok: true,
    solution: {
      headline: `Work out $${n} \\div ${d}$`,
      methodName: 'Short (bus-stop) division',
      steps,
      answerLatex: `${data.quotient}${remainderNote(data.remainder)}`,
    },
  };
}

/* ----------------------------------------------------------------- long */
function solveLong(n: number, d: number): SolveResult {
  const data = busStop(n, d);
  const steps: Step[] = [
    {
      note: 'Set out the long-division bracket, then repeatedly divide, multiply and subtract.',
      visual: { kind: 'long-division', data },
    },
  ];

  let carry = 0;
  const digits = String(n).split('');
  digits.forEach((ch, i) => {
    const cur = carry * 10 + Number(ch);
    const q = Math.floor(cur / d);
    const prod = q * d;
    carry = cur - prod;
    const broughtDown = i < digits.length - 1 ? `\\text{ bring down } ${digits[i + 1]}` : '';
    steps.push({
      note: `How many ${d}s in ${cur}? ${q}. Multiply and subtract.`,
      latex: `${d} \\times ${q} = ${prod}, \\quad ${cur} - ${prod} = ${carry}${broughtDown ? `,\\;` + broughtDown : ''}`,
    });
  });

  steps.push({
    note: 'Collect the quotient digits.',
    latex: `${n} \\div ${d} = ${data.quotient}${remainderNote(data.remainder)}`,
    annotation: 'answer',
  });

  return {
    ok: true,
    solution: {
      headline: `Work out $${n} \\div ${d}$`,
      methodName: 'Long division',
      steps,
      answerLatex: `${data.quotient}${remainderNote(data.remainder)}`,
    },
  };
}

/* ------------------------------------------------------------- chunking */
function solveChunking(n: number, d: number): SolveResult {
  const steps: Step[] = [
    {
      note: 'Subtract easy “chunks” of the divisor (tens, then units) until nothing big enough is left.',
      latex: `${n} \\div ${d}`,
    },
  ];

  let remaining = n;
  let quotient = 0;
  let place = 1;
  while (d * place * 10 <= n) place *= 10;

  for (; place >= 1; place = Math.floor(place / 10)) {
    const t = Math.floor(remaining / (d * place));
    if (t <= 0) continue;
    const mult = t * place;
    const amount = mult * d;
    steps.push({
      note: `${d} × ${mult} = ${amount} fits into ${remaining}. Subtract it.`,
      latex: `${remaining} - ${amount} = ${remaining - amount} \\qquad (${mult} \\times ${d})`,
      annotation: `+${mult} to the quotient`,
    });
    remaining -= amount;
    quotient += mult;
  }

  steps.push({
    note: 'Add up the chunks you took out.',
    latex: `${n} \\div ${d} = ${quotient}${remainderNote(remaining)}`,
    annotation: 'answer',
  });

  return {
    ok: true,
    solution: {
      headline: `Work out $${n} \\div ${d}$`,
      methodName: 'Chunking (repeated subtraction)',
      steps,
      answerLatex: `${quotient}${remainderNote(remaining)}`,
    },
  };
}

export const divisionSolver: Solver = {
  id: 'division',
  title: 'Division',
  subjects: ['Foundations'],
  blurb: 'Divide whole numbers, with the method you know.',
  placeholder: 'e.g.  864 ÷ 24',
  methods: [
    { id: 'short', name: 'Short (bus-stop)', blurb: 'Compact working, carrying each remainder along the top. Best for smaller divisors.' },
    { id: 'long', name: 'Long division', blurb: 'Divide, multiply, subtract, bring down — shown in full.' },
    { id: 'chunking', name: 'Chunking', blurb: 'Subtract big multiples of the divisor and add up how many you took.' },
  ],
  defaultMethodId: 'short',
  detect(input) {
    const s = input.replace(/\s+/g, '');
    if (/[a-zA-Z]/.test(s)) return 0;
    return /^\d+[÷/]\d+$/.test(s) ? 0.9 : 0;
  },
  solve(input, methodId): SolveResult {
    let pair: { n: number; d: number };
    try {
      pair = parseDivision(input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not read that.' };
    }
    if (methodId === 'long') return solveLong(pair.n, pair.d);
    if (methodId === 'chunking') return solveChunking(pair.n, pair.d);
    return solveShort(pair.n, pair.d);
  },
};
