/**
 * Which letter-runs are maths and which are English.
 *
 * One shared answer, because three different places need it and they must
 * agree: the input preview (prose must not be set as italic KaTeX), the
 * expression parser (prose must not become a product of variables), and the
 * multi-part splitter (a fragment of prose is not a sub-problem).
 *
 * The rule is asymmetric on purpose. A stray English word read as maths is
 * silent and produces a wrong answer; a stray maths word read as English just
 * shows a message. So when in doubt, call it English.
 */

/** Letter-runs that genuinely belong in an expression. */
export const MATH_WORDS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'sinh', 'cosh', 'tanh',
  'asin', 'acos', 'atan', 'arcsin', 'arccos', 'arctan',
  'log', 'ln', 'exp', 'sqrt', 'cbrt', 'abs', 'det', 'adj',
  'pi', 'tau', 'inf', 'nan',
  'dx', 'dy', 'dt', 'dv', 'dr', 'du',
  'lim', 'sum', 'int', 'max', 'min', 'mod', 'gcd', 'lcm',
  'ncr', 'npr', 'nsr',
]);

/**
 * Short English words that would otherwise pass the length test. "and" is
 * three letters, so without this list it parses as the product a·n·d — which
 * is exactly how "x^3 - 3x and stationary points" used to yield an answer of
 * 3x² − 3·and·stationary·points instead of an honest failure.
 */
const SHORT_PROSE = new Set([
  'and', 'the', 'for', 'its', 'it', 'is', 'are', 'was', 'be', 'to', 'of',
  'at', 'in', 'on', 'by', 'as', 'or', 'if', 'so', 'an', 'a', 'no', 'not',
  'me', 'my', 'we', 'us', 'you', 'i',
  'all', 'any', 'both', 'now', 'new', 'old', 'per', 'via', 'out', 'up',
  'has', 'had', 'do', 'did', 'get', 'got', 'use', 'let', 'say',
  'how', 'why', 'who', 'what', 'when', 'then', 'than', 'that', 'this',
]);

/**
 * Function names that may be written straight onto their argument, as in
 * `sinx` or `sqrt2`. Deliberately narrower than MATH_WORDS: `int`, `sum` and
 * `pi` are maths when they stand alone, but matching them mid-word would find
 * `int` inside "po·int·s" and read the rest as variables.
 */
const GLUABLE = [
  'arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'sqrt', 'cbrt', 'log', 'ln', 'exp', 'abs',
];

/**
 * Read a letter-run the way the expression parser does — greedily matching
 * function names, taking anything else one letter at a time — and return just
 * the letters that had to stand alone as variables. `sinxcosx` leaves `xx`;
 * `andstationarypoints` leaves all nineteen letters.
 */
function variableLettersIn(word: string): string {
  let out = '';
  let i = 0;
  while (i < word.length) {
    const fn = GLUABLE.find((f) => word.startsWith(f, i));
    if (fn) i += fn.length;
    else out += word[i++];
  }
  return out;
}

/**
 * True when this letter-run is English rather than maths.
 *
 * Once function names are peeled off, anything four letters or longer is
 * prose: SACE uses single-letter variables, so the longest legitimate runs
 * are short implicit products like `xy` or `abc`.
 */
export function isProseWord(word: string): boolean {
  const w = word.toLowerCase();
  if (MATH_WORDS.has(w)) return false;
  if (SHORT_PROSE.has(w)) return true;
  const rest = variableLettersIn(w);
  if (SHORT_PROSE.has(rest)) return true;
  return rest.length >= 4;
}

/** True when the whole string reads as maths rather than a sentence. */
export function isExpression(text: string): boolean {
  const words = text.match(/[A-Za-z]+/g) ?? [];
  return !words.some(isProseWord);
}

/** The English words in a string, in order — what a parser would have to ignore. */
export function proseWordsIn(text: string): string[] {
  return (text.match(/[A-Za-z]+/g) ?? []).filter(isProseWord);
}
