import { normalise } from './normalise';
import { interpret, runSolve } from '../engine/run';
import { getSolver } from '../engine/registry';

const n = (s: string) => normalise(s).text;

describe('normalise — leaves canonical input alone', () => {
  const canonical = [
    'a=7, b=9, C=40',
    '2x^2 + 7x - 4 = 0',
    'circle r=5',
    '3/4 + 1/6',
    '[[1,2],[3,4]]',
    '(3+4i)*(1-2i)',
    'binomial n=10, p=0.5, x=3',
    '3, 7, 11, 15',
    '234 × 56',
  ];
  for (const c of canonical) {
    it(`passes through "${c}"`, () => {
      expect(normalise(c).rewritten).toBe(false);
    });
  }
});

describe('normalise — question stems and politeness', () => {
  it('strips a question opener', () => {
    expect(n("what's 234 × 56")).toBe('234 × 56');
  });
  it('strips politeness and the command verb', () => {
    expect(n('can you please solve 2x + 3 = 7')).toBe('2x + 3 = 7');
  });
  it('drops a trailing question mark', () => {
    expect(n('what is 5 + 3?')).toBe('5 + 3');
  });
});

describe('normalise — words into symbols', () => {
  it('turns operator words into symbols', () => {
    expect(n('7 times 8')).toBe('7 × 8');
    expect(n('20 divided by 4')).toBe('20 ÷ 4');
    expect(n('3 plus 4')).toBe('3 + 4');
  });
  it('handles squared and cubed', () => {
    expect(n('x squared + 5x + 6 = 0')).toBe('x^2 + 5x + 6 = 0');
    expect(n('x cubed')).toBe('x^3');
  });
  it('handles "to the power of"', () => {
    expect(n('2 to the power of 5')).toBe('2^5');
  });
  it('converts word numbers', () => {
    expect(n('seven times eight')).toBe('7 × 8');
    expect(n('twenty five plus 3')).toBe('25 + 3');
  });
});

describe('normalise — measurement vocabulary', () => {
  it('reads a circle radius', () => {
    expect(n('area of a circle with radius 5')).toBe('area circle r=5');
  });
  it('halves a diameter', () => {
    expect(n('circle with diameter 10')).toBe('circle r=5');
  });
  it('reads a cylinder', () => {
    expect(n('volume of a cylinder with radius 3 and height 10')).toContain('r=3');
    expect(n('volume of a cylinder with radius 3 and height 10')).toContain('h=10');
  });
  it('strips units from measurements', () => {
    expect(n('rectangle length 8cm width 3cm')).toBe('rectangle l=8 w=3');
  });
});

describe('normalise — trigonometry vocabulary', () => {
  it('reads two sides and an included angle', () => {
    const out = n('triangle with sides 7 and 9 and an included angle of 40');
    expect(out).toContain('a=7');
    expect(out).toContain('b=9');
    expect(out).toContain('C=40');
  });
  it('reads a right triangle hypotenuse', () => {
    const out = n('right triangle with hypotenuse 13 and one side 5');
    expect(out).toContain('c=13');
  });
  it('sends a bare angle to C in a general triangle', () => {
    expect(n('triangle with sides 6 and 8 and angle 50')).toContain('C=50');
  });
  it('sends a bare angle to A in a right triangle', () => {
    expect(n('right triangle angle 30 hypotenuse 10')).toContain('A=30');
  });
  it('reads a named angle', () => {
    expect(n('a=10, angle A 80, angle B 40')).toBe('a=10, A=80, B=40');
  });
});

describe('normalise — sequences and statistics', () => {
  it('reads an ordinal term', () => {
    expect(n('10th term of 3, 7, 11, 15')).toContain('n=10');
  });
  it('reads "first 20 terms"', () => {
    expect(n('sum of the first 20 terms of 2, 6, 18')).toContain('n=20');
  });
  it('reads common difference and first term', () => {
    const out = n('arithmetic sequence with first term 5 and common difference 3');
    expect(out).toContain('a=5');
    expect(out).toContain('d=3');
  });
  it('reads a binomial phrased in words', () => {
    const out = n('probability of exactly 3 heads in 10 coin flips');
    expect(out).toContain('x=3');
    expect(out).toContain('n=10');
  });
  it('reads a normal distribution', () => {
    const out = n('normal with mean 100 and standard deviation 15');
    expect(out).toContain('mean=100');
    expect(out).toContain('sd=15');
  });
  it('reads log base notation', () => {
    expect(n('log base 2 of 32')).toBe('log2 32');
  });
});

/**
 * The real test of the layer: natural phrasing must reach the right topic and
 * produce a correct answer, end to end.
 */
describe('natural language end to end', () => {
  const cases: Array<[string, string, string?]> = [
    ["what's 234 times 56", 'multiplication', '13104'],
    ['what is the area of a circle with radius 5', 'measurement'],
    ['volume of a cylinder with radius 3 and height 10', 'measurement'],
    ['solve x squared plus 5x plus 6 equals 0', 'quadratics'],
    ['a triangle with sides 7 and 9 and an included angle of 40', 'triangle-rules'],
    ['right triangle with sides 3 and 4', 'right-triangle', 'c = 5'],
    ['if I invest $5000 at 4% for 3 years compounded monthly', 'financial'],
    ['the derivative of x cubed minus 4x squared', 'differentiate'],
    ['integrate 3x squared from 0 to 2', 'integrate', '8'],
    ['what is the mean of 4, 8, 15, 16, 23, 42', 'statistics'],
    ['probability of exactly 3 heads in 10 coin flips with p=0.5', 'distributions'],
    ['10th term of 3, 7, 11, 15', 'sequences'],
    ['log base 2 of 32', 'logarithms'],
  ];

  for (const [phrase, topic, expected] of cases) {
    it(`understands "${phrase}"`, () => {
      const res = interpret(phrase);
      expect(res.detection?.solver.id, `detected ${res.detection?.solver.id} from "${res.text}"`).toBe(topic);

      const solver = getSolver(topic)!;
      const solved = runSolve(solver, phrase, solver.defaultMethodId);
      expect(solved.ok, solved.ok ? '' : solved.error).toBe(true);
      if (expected && solved.ok) {
        expect(solved.solution.answerLatex).toContain(expected);
      }
    });
  }
});

describe('normalise — robustness', () => {
  it('never strips meaningful input down to nothing', () => {
    for (const junk of ['what is', 'please', '???', 'the value of']) {
      expect(normalise(junk).text.length).toBeGreaterThan(0);
    }
  });
  it('leaves blank input blank', () => {
    expect(normalise('   ').text).toBe('');
  });
  it('handles very long input without hanging', () => {
    const started = Date.now();
    normalise('what is the area of a circle with radius 5 '.repeat(200));
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
