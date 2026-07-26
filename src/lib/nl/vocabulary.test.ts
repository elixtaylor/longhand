import { isProseWord, isExpression, proseWordsIn } from './vocabulary';
import { parseExpr, ExprError } from '../math/expr';
import { parsePoly, ParseError } from '../math/parse';
import { differentiationSolver } from '../../solvers/calculus/differentiate';

/**
 * These guard a class of bug where English left in the input was parsed as
 * maths and produced a confident wrong answer instead of an error. A student
 * cannot tell a wrong answer from a right one — that is the whole reason they
 * are here — so silent wrongness is the worst thing this app can do.
 */

describe('telling maths from English', () => {
  it('accepts real expression words', () => {
    for (const w of ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'pi', 'dx', 'det']) {
      expect(isProseWord(w), `${w} is maths`).toBe(false);
    }
  });

  it('accepts single letters and short implicit products', () => {
    for (const w of ['x', 'y', 'n', 'xy', 'abc', 'mgh']) {
      expect(isProseWord(w), `${w} is maths`).toBe(false);
    }
  });

  it('reads a function glued to its argument', () => {
    // The parser reads these as sin(x), ln(x), √x — not as long variables.
    for (const w of ['sinx', 'cosx', 'lnx', 'sqrtx', 'sinxcosx']) {
      expect(isProseWord(w), `${w} is maths`).toBe(false);
    }
  });

  it('rejects English words, including three-letter ones', () => {
    for (const w of ['and', 'then', 'the', 'that', 'find', 'stationary', 'points', 'answer']) {
      expect(isProseWord(w), `${w} is English`).toBe(true);
    }
  });

  it('judges whole strings', () => {
    expect(isExpression('x^2 + 3x - 4')).toBe(true);
    expect(isExpression('2 sin x cos x')).toBe(true);
    expect(isExpression('x^3 - 3x and find the stationary points')).toBe(false);
    expect(proseWordsIn('x^2 and then y')).toEqual(['and', 'then']);
  });
});

describe('parsers refuse what they cannot read', () => {
  it('does not turn an English tail into a product of variables', () => {
    // Was: a·n·d·s·t·a·t·i·o·n·… giving f'(x) = 3x² − 3·and·stationary·points.
    expect(() => parseExpr('x^3 - 3x and stationary points')).toThrow(ExprError);
    expect(() => parsePoly('x^2 - 4 and then some')).toThrow(ParseError);
  });

  it('does not truncate an exponent at the first non-digit', () => {
    // Was: "^2sinx" read as power 2, silently discarding "sin x", so
    // "x^2 sin x and integrate 3x^2" differentiated to 2x.
    expect(() => parsePoly('x^2sinx')).toThrow(ParseError);
    expect(() => parsePoly('x^2y')).toThrow(ParseError);
  });

  it('still parses the legitimate forms', () => {
    expect(parsePoly('3x^2 - 4x + 1').degree()).toBe(2);
    expect(() => parseExpr('x^2 * sin x')).not.toThrow();
    expect(() => parseExpr('2sinxcosx')).not.toThrow();
  });

  it('reports a mixed-topic question instead of half-answering it', () => {
    const r = differentiationSolver.solve('x^2 sin x and integrate 3x^2', 'rules');
    expect(r.ok).toBe(false);
  });
});
