import { detectSolver, solvers, getSolver } from './registry';
import { examples } from '../../data/examples';

/** Every registered solver must expose the full contract. */
describe('registry integrity', () => {
  it('gives every solver a unique id and at least one method', () => {
    const ids = new Set<string>();
    for (const s of solvers) {
      expect(s.id, `${s.title} needs an id`).toBeTruthy();
      expect(ids.has(s.id), `duplicate id: ${s.id}`).toBe(false);
      ids.add(s.id);
      expect(s.methods.length, `${s.title} needs a method`).toBeGreaterThan(0);
      expect(
        s.methods.some((m) => m.id === s.defaultMethodId),
        `${s.title} defaultMethodId must be one of its methods`,
      ).toBe(true);
      expect(typeof s.detect, `${s.title} needs a detector`).toBe('function');
    }
  });

  /**
   * Every detector sees every input, so one bad parser hangs the whole app.
   * These probes deliberately cross topic boundaries — a complex-number
   * string reaching the vector parser, a matrix reaching the trig parser.
   */
  it('never lets a detector throw, hang, or return out of range', () => {
    const probes = [
      '',
      'x',
      '???',
      '2x+1=0',
      'sin(30)',
      'sin x = 0.5',
      '[[1,2],[3,4]]',
      'det [[6,1,1],[4,-2,5],[2,8,7]]',
      '5000 at 4% for 3 years',
      '3+4i',
      '|3+4i|',
      '(3+4i)*(1-2i)',
      'polar 3+4i',
      '(1,2,3) . (4,5,6)',
      'a=7, b=9, C=40',
      'cylinder r=3, h=10',
      '3, 7, 11, 15',
      'sum r^2',
      'x^3 - 2x^2 - 5x + 6',
      '2^x = 32',
      'log2(32)',
      '-----',
      '((((',
      '1/0',
      'i'.repeat(50),
      '9'.repeat(60),
    ];
    for (const s of solvers) {
      for (const p of probes) {
        const started = Date.now();
        const score = s.detect(p);
        expect(Date.now() - started, `${s.id} took too long on "${p}"`).toBeLessThan(250);
        expect(Number.isFinite(score), `${s.id} on "${p}"`).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });

  /** Whatever a detector claims, the solver behind it must respond sanely. */
  it('never lets a solve throw on any probe it claims', () => {
    const probes = ['', 'x', '???', '3+4i', '[[1,2]]', 'sum r', '2^x = 32', 'a=3, b=4'];
    for (const s of solvers) {
      for (const p of probes) {
        expect(() => s.solve(p, s.defaultMethodId), `${s.id} threw on "${p}"`).not.toThrow();
      }
    }
  });
});

describe('detectSolver', () => {
  const cases: Array<[string, string]> = [
    ['234 × 56', 'multiplication'],
    ['864 ÷ 24', 'division'],
    ['3/4 + 1/6', 'fractions'],
    ['3x + 4 = 2x - 5', 'linear'],
    ['2x + 3y = 12 ; x - y = 1', 'simultaneous'],
    ['2x^2 + 7x - 4 = 0', 'quadratics'],
    ['d/dx(x^3 - 4x)', 'differentiate'],
    ['∫ 3x^2 + 2x dx', 'integrate'],
  ];

  for (const [input, expected] of cases) {
    it(`recognises "${input}" as ${expected}`, () => {
      expect(detectSolver(input)?.solver.id).toBe(expected);
    });
  }

  /**
   * Every example is a promise to the student that it will work when clicked.
   */
  it('solves every example in the library', () => {
    expect(examples.length).toBeGreaterThan(0);
    for (const ex of examples) {
      const solver = getSolver(ex.solverId);
      expect(solver, `example "${ex.label}" points at unknown topic "${ex.solverId}"`).toBeTruthy();
      const methodId = ex.methodId ?? solver!.defaultMethodId;
      expect(
        solver!.methods.some((m) => m.id === methodId),
        `example "${ex.label}" uses unknown method "${methodId}"`,
      ).toBe(true);
      const res = solver!.solve(ex.input, methodId);
      expect(res.ok, `example "${ex.label}" failed: ${res.ok ? '' : res.error}`).toBe(true);
      if (res.ok) {
        expect(res.solution.steps.length, `example "${ex.label}" produced no steps`).toBeGreaterThan(0);
      }
    }
  });

  it('returns null for an empty or unrecognisable input', () => {
    expect(detectSolver('')).toBeNull();
    expect(detectSolver('   ')).toBeNull();
    expect(detectSolver('hello there')).toBeNull();
  });

  it('solves what it detects', () => {
    for (const [input] of cases) {
      const found = detectSolver(input);
      expect(found, `nothing detected for ${input}`).not.toBeNull();
      const res = found!.solver.solve(input, found!.solver.defaultMethodId);
      expect(res.ok, `${input} detected as ${found!.solver.id} but failed to solve`).toBe(true);
    }
  });
});
