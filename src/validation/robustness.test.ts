import { solvers } from '../lib/engine/registry';

/**
 * Public-input robustness gate.
 *
 * These are not meant to be solvable questions. They represent incomplete
 * typing, pasted garbage, non-finite notation and values large enough to
 * expose unsafe numeric conversions. Every registered method must fail
 * cleanly rather than throw or return broken display maths.
 */
describe('all registered engines handle malformed public input safely', () => {
  let fuzzState = 0x1badf00d;
  const fuzzAlphabet =
    '0123456789xyzabc+-*/^=(),[]{}.|% eE;_∞√≤≥abcdefghijklmnopqrstuvwxyz';
  const fuzzInputs = Array.from({ length: 48 }, (_, index) => {
    const length = 8 + (index % 57);
    let value = '';
    for (let i = 0; i < length; i++) {
      fuzzState = (Math.imul(fuzzState, 1664525) + 1013904223) >>> 0;
      value += fuzzAlphabet[fuzzState % fuzzAlphabet.length];
    }
    return value;
  });
  const hostileInputs = [
    '',
    '   ',
    'not a maths problem',
    'x =',
    '= 0',
    '(((((((((',
    'NaN',
    'Infinity',
    '1e309',
    '0/0',
    '1..2',
    'x^999999999',
    '\0null byte',
    `1${'0'.repeat(400)}`,
    ...fuzzInputs,
  ];

  for (const solver of solvers) {
    it(`${solver.id} never throws or exposes a non-finite successful result`, () => {
      const failures: string[] = [];

      for (const method of solver.methods) {
        for (const input of hostileInputs) {
          try {
            const result = solver.solve(input, method.id);
            if (!result.ok) continue;
            const rendered = JSON.stringify(result.solution);
            if (/NaN|Infinity|\\text\{undefined\}/.test(rendered))
              failures.push(
                `${solver.id}.${method.id} exposed broken maths for “${input.slice(0, 40)}”`,
              );
            if (result.solution.steps.length > 80)
              failures.push(
                `${solver.id}.${method.id} produced runaway working for “${input.slice(0, 40)}”`,
              );
          } catch (error) {
            failures.push(
              `${solver.id}.${method.id} threw for “${input.slice(0, 40)}”: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      expect(
        failures.slice(0, 50),
        `first failures of ${failures.length}`,
      ).toEqual([]);
    });
  }
});
