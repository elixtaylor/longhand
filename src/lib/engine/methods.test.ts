import { distinctMethods, hasMethodChoice } from './methods';
import { getSolver, solvers } from './registry';
import { runSolve } from './run';

/**
 * A method tab is a promise that clicking it shows a different way of doing
 * the problem. These check the promise holds: identical working is offered
 * once, and genuinely different working is never hidden.
 */

const methodsFor = (id: string, input: string) =>
  distinctMethods(getSolver(id)!, input).map((m) => m.name);

describe('offering a method only when it differs', () => {
  it('collapses methods that produce the same working', () => {
    // Converting ln x = 5 to index form is the same working whichever method
    // is selected, so there is nothing to choose between.
    expect(methodsFor('logarithms', 'ln x = 5')).toEqual(['Equating indices']);
    // 3^x = 20 has no whole-number index, so both routes end up taking logs.
    expect(methodsFor('logarithms', '3^x = 20')).toEqual(['Equating indices']);
  });

  it('keeps methods that genuinely differ', () => {
    // 2^x = 32 really can be done both ways, and they look different.
    expect(methodsFor('logarithms', '2^x = 32')).toHaveLength(2);
    expect(methodsFor('linear', '3x + 4 = 2x - 5')).toHaveLength(2);
    expect(methodsFor('quadratics', '2x^2 + 7x - 4 = 0')).toHaveLength(3);
    expect(methodsFor('division', '864 ÷ 24')).toHaveLength(3);
  });

  it('keeps a method that reports the problem cannot be done that way', () => {
    // "This doesn't factorise" is a different — and useful — piece of working.
    expect(methodsFor('quadratics', 'x^2 + 6x + 2 = 0')).toContain('Factorising');
  });

  it('never offers a method whose working the solver cannot produce', () => {
    for (const solver of solvers) {
      for (const input of ['', 'x', '???']) {
        for (const m of distinctMethods(solver, input)) {
          expect(
            solver.methods.some((x) => x.id === m.id),
            `${solver.id} offered a method it does not have`,
          ).toBe(true);
        }
      }
    }
  });

  it('never returns an empty list', () => {
    for (const solver of solvers) {
      for (const input of ['', '   ', 'nonsense here', 'x']) {
        expect(distinctMethods(solver, input).length, `${solver.id} on "${input}"`).toBeGreaterThan(0);
      }
    }
  });

  it('agrees with hasMethodChoice', () => {
    expect(hasMethodChoice(getSolver('logarithms')!, 'ln x = 5')).toBe(false);
    expect(hasMethodChoice(getSolver('logarithms')!, '2^x = 32')).toBe(true);
  });

  it('keeps the working of every method it offers', () => {
    // Whatever survives deduplication must still solve — a tab that leads
    // nowhere is worse than no tab.
    for (const [id, input] of [
      ['quadratics', '2x^2 + 7x - 4 = 0'],
      ['linear', '5x - 7 = 18'],
      ['division', '4928 ÷ 16'],
    ] as const) {
      const solver = getSolver(id)!;
      for (const m of distinctMethods(solver, input)) {
        expect(runSolve(solver, input, m.id).ok, `${id} / ${m.name}`).toBe(true);
      }
    }
  });
});
