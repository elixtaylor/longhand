/**
 * Problems imported from openly-licensed textbooks.
 *
 * Every entry records exactly where it came from so the attribution required
 * by the licence travels with the problem itself and cannot drift. Longhand
 * generates all of the *working* itself — only the questions are imported.
 *
 * See CONTENT-LICENSE.md for the licence terms and what they mean for reuse.
 */

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  licence: string;
  licenceUrl: string;
}

export const SOURCES: Record<string, Source> = {
  'openstax-alg-trig-2e': {
    id: 'openstax-alg-trig-2e',
    title: 'Algebra and Trigonometry 2e',
    publisher: 'OpenStax, Rice University',
    url: 'https://openstax.org/books/algebra-and-trigonometry-2e',
    licence: 'CC BY-NC-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  },
};

export interface ImportedProblem {
  /** The text fed to the engine. */
  input: string;
  /** How the problem is shown in the list. */
  label: string;
  solverId: string;
  methodId?: string;
  /** Key into SOURCES. */
  source: string;
  /** Where in the source, e.g. "§2.5 Exercise 6". */
  ref: string;
}

/**
 * Imported questions, grouped by the section they came from. Anything the
 * engine cannot yet handle (cubics, equations in 1/x², parenthesised
 * coefficients) was left out rather than silently rewritten.
 */
export const IMPORTED: ImportedProblem[] = [
  /* ---------------- Algebra and Trigonometry 2e, §2.5 Quadratic Equations */
  // Solve by factoring
  { input: 'x^2 + 4x - 21 = 0', label: 'x² + 4x − 21 = 0', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 6' },
  { input: 'x^2 - 9x + 18 = 0', label: 'x² − 9x + 18 = 0', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 7' },
  { input: '2x^2 + 9x - 5 = 0', label: '2x² + 9x − 5 = 0', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 8' },
  { input: '6x^2 + 17x + 5 = 0', label: '6x² + 17x + 5 = 0', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 9' },
  { input: '4x^2 - 12x + 8 = 0', label: '4x² − 12x + 8 = 0', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 10' },
  { input: '3x^2 - 75 = 0', label: '3x² − 75 = 0', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 11' },
  { input: '8x^2 + 6x - 9 = 0', label: '8x² + 6x − 9 = 0', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 12' },
  { input: '4x^2 = 9', label: '4x² = 9', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 13' },
  { input: '2x^2 + 14x = 36', label: '2x² + 14x = 36', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 14' },
  { input: '5x^2 = 5x + 30', label: '5x² = 5x + 30', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 15' },
  { input: '4x^2 = 5x', label: '4x² = 5x', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 16' },
  { input: '7x^2 + 3x = 0', label: '7x² + 3x = 0', solverId: 'quadratics', methodId: 'factorise', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 17' },

  // Solve by completing the square
  { input: 'x^2 - 9x - 22 = 0', label: 'x² − 9x − 22 = 0', solverId: 'quadratics', methodId: 'complete-square', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 25' },
  { input: '2x^2 - 8x - 5 = 0', label: '2x² − 8x − 5 = 0', solverId: 'quadratics', methodId: 'complete-square', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 26' },
  { input: 'x^2 - 6x = 13', label: 'x² − 6x = 13', solverId: 'quadratics', methodId: 'complete-square', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 27' },
  // Ex 30 is printed in the variable p; solved here in x, which changes nothing.
  { input: '6x^2 + 7x - 20 = 0', label: '6x² + 7x − 20 = 0', solverId: 'quadratics', methodId: 'complete-square', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 30 (p→x)' },
  { input: '2x^2 - 3x - 1 = 0', label: '2x² − 3x − 1 = 0', solverId: 'quadratics', methodId: 'complete-square', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 31' },

  // Solve with the quadratic formula
  { input: '2x^2 + 5x + 3 = 0', label: '2x² + 5x + 3 = 0', solverId: 'quadratics', methodId: 'formula', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 38' },
  { input: 'x^2 + x = 4', label: 'x² + x = 4', solverId: 'quadratics', methodId: 'formula', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 39' },
  { input: '3x^2 - 5x + 1 = 0', label: '3x² − 5x + 1 = 0', solverId: 'quadratics', methodId: 'formula', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 41' },
  { input: 'x^2 + 4x + 2 = 0', label: 'x² + 4x + 2 = 0', solverId: 'quadratics', methodId: 'formula', source: 'openstax-alg-trig-2e', ref: '§2.5 Ex 42' },

  /* -------- Algebra and Trigonometry 2e, §11.1 Systems of Linear Equations */
  { input: '5x - y = 4 ; x + 6y = 2', label: '5x − y = 4 ;  x + 6y = 2', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 6' },
  { input: '-3x - 5y = 13 ; -x + 4y = 10', label: '−3x − 5y = 13 ;  −x + 4y = 10', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 7' },
  { input: '3x + 7y = 1 ; 2x + 4y = 0', label: '3x + 7y = 1 ;  2x + 4y = 0', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 8' },
  { input: '-2x + 5y = 7 ; 2x + 9y = 7', label: '−2x + 5y = 7 ;  2x + 9y = 7', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 9' },
  { input: 'x + 8y = 43 ; 3x - 2y = -1', label: 'x + 8y = 43 ;  3x − 2y = −1', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 10' },
  { input: 'x + 3y = 5 ; 2x + 3y = 4', label: 'x + 3y = 5 ;  2x + 3y = 4', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 11' },
  { input: '3x - 2y = 18 ; 5x + 10y = -10', label: '3x − 2y = 18 ;  5x + 10y = −10', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 12' },
  { input: '4x + 2y = -10 ; 3x + 9y = 0', label: '4x + 2y = −10 ;  3x + 9y = 0', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 13' },
  { input: '2x + 4y = -3.8 ; 9x - 5y = 1.3', label: '2x + 4y = −3.8 ;  9x − 5y = 1.3', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 14' },
  { input: '-2x + 3y = 1.2 ; -3x - 6y = 1.8', label: '−2x + 3y = 1.2 ;  −3x − 6y = 1.8', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 15' },
  // Ex 17 and 18 are deliberately degenerate — no solution / infinitely many.
  { input: '3x + 5y = 9 ; 30x + 50y = -90', label: '3x + 5y = 9 ;  30x + 50y = −90', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 17' },
  { input: '-3x + y = 2 ; 12x - 4y = -8', label: '−3x + y = 2 ;  12x − 4y = −8', solverId: 'simultaneous', source: 'openstax-alg-trig-2e', ref: '§11.1 Ex 18' },

  /* ------- Algebra and Trigonometry 2e, §10.2 Non-right Triangles: Cosines */
  // Find the missing side
  { input: 'C=41.2, a=2.49, b=3.13', label: 'γ = 41.2°, a = 2.49, b = 3.13', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 6' },
  { input: 'A=120, b=6, c=7', label: 'α = 120°, b = 6, c = 7', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 7' },
  { input: 'B=58.7, a=10.6, c=15.7', label: 'β = 58.7°, a = 10.6, c = 15.7', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 8' },
  { input: 'C=115, a=18, b=23', label: 'γ = 115°, a = 18, b = 23', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 9' },
  // Ex 10–15 give an angle OPPOSITE a known side (SSA), not the included angle,
  // so they are sine-rule problems — the ambiguous case.
  { input: 'A=119, a=26, b=14', label: 'α = 119°, a = 26, b = 14', solverId: 'triangle-rules', methodId: 'sine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 10' },
  { input: 'C=113, b=10, c=32', label: 'γ = 113°, b = 10, c = 32', solverId: 'triangle-rules', methodId: 'sine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 11' },
  { input: 'B=67, a=49, b=38', label: 'β = 67°, a = 49, b = 38', solverId: 'triangle-rules', methodId: 'sine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 12' },
  { input: 'A=43.1, a=184.2, b=242.8', label: 'α = 43.1°, a = 184.2, b = 242.8', solverId: 'triangle-rules', methodId: 'sine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 13' },
  { input: 'B=50, a=105, b=45', label: 'β = 50°, a = 105, b = 45', solverId: 'triangle-rules', methodId: 'sine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 15' },

  // Find the missing angle from three sides
  { input: 'a=42, b=19, c=30', label: 'a = 42, b = 19, c = 30  (find an angle)', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 16' },
  { input: 'a=14, b=13, c=20', label: 'a = 14, b = 13, c = 20  (find an angle)', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 17' },
  { input: 'a=16, b=31, c=20', label: 'a = 16, b = 31, c = 20  (find an angle)', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 18' },
  { input: 'a=13, b=22, c=28', label: 'a = 13, b = 22, c = 28  (find an angle)', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 19' },
  { input: 'a=108, b=132, c=160', label: 'a = 108, b = 132, c = 160  (find an angle)', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 20' },

  // Solve the triangle
  { input: 'A=35, b=8, c=11', label: 'A = 35°, b = 8, c = 11', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 21' },
  { input: 'B=88, a=4.4, c=5.2', label: 'B = 88°, a = 4.4, c = 5.2', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 22' },
  { input: 'C=121, a=21, b=37', label: 'C = 121°, a = 21, b = 37', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 23' },
  { input: 'a=13, b=11, c=15', label: 'a = 13, b = 11, c = 15', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 24' },
  { input: 'a=3.1, b=3.5, c=5', label: 'a = 3.1, b = 3.5, c = 5', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 25' },
  { input: 'a=51, b=25, c=29', label: 'a = 51, b = 25, c = 29', solverId: 'triangle-rules', methodId: 'cosine-rule', source: 'openstax-alg-trig-2e', ref: '§10.2 Ex 26' },
];

export function importedFor(solverId: string): ImportedProblem[] {
  return IMPORTED.filter((p) => p.solverId === solverId);
}

export function sourceOf(p: ImportedProblem): Source {
  return SOURCES[p.source];
}
