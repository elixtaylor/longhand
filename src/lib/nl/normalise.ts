/**
 * Natural-language normalisation.
 *
 * Students type "what's the area of a circle with radius 5", not "circle r=5".
 * This layer rewrites ordinary English into the canonical forms the solvers
 * already parse, so every topic gets natural input without 22 separate parsers.
 *
 * Two rules govern everything here:
 *   1. Canonical input must pass through untouched — "a=7, b=9, C=40" already
 *      works and must keep working.
 *   2. Case is meaningful. Trigonometry uses lowercase for sides and uppercase
 *      for angles, so nothing lowercases the whole string.
 */

export interface Reading {
  /** Canonical text handed to the solvers. */
  text: string;
  /** True when normalisation actually rewrote something worth showing. */
  rewritten: boolean;
}

/* ------------------------------------------------------------ word numbers */

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};

const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, twentieth: 20,
};

function wordNumbers(s: string): string {
  // Compound tens first ("twenty five" → 25) so the parts aren't eaten early.
  const tensAlt = Object.keys(TENS).join('|');
  const onesAlt = Object.keys(ONES).join('|');
  s = s.replace(
    new RegExp(`\\b(${tensAlt})[\\s-](${onesAlt})\\b`, 'gi'),
    (_m, t: string, o: string) => String(TENS[t.toLowerCase()] + ONES[o.toLowerCase()]),
  );
  s = s.replace(new RegExp(`\\b(${tensAlt})\\b`, 'gi'), (m) => String(TENS[m.toLowerCase()]));
  // "second" is also an ordinal *and* a unit of time; ordinals are handled
  // separately below, so only convert bare cardinals here.
  s = s.replace(new RegExp(`\\b(${onesAlt})\\b`, 'gi'), (m) => String(ONES[m.toLowerCase()]));
  return s;
}

/* --------------------------------------------------------------- unicode */

function unicode(s: string): string {
  return s
    .replace(/[−‒–—]/g, '-') // minus / dashes
    .replace(/[×⋅•]/g, '×')
    .replace(/÷/g, '÷')
    // Greek angle names, as textbooks label triangles.
    .replace(/α/g, 'A')
    .replace(/β/g, 'B')
    .replace(/γ/g, 'C')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

/* ----------------------------------------------------------------- stems */

/** Politeness and question openers that carry no mathematical meaning. */
const STEMS = [
  /\b(?:can|could|would)\s+you\s+(?:please\s+)?(?:help\s+me\s+)?/gi,
  /\bplease\b/gi,
  /\b(?:i\s+need\s+to|i\s+want\s+to|help\s+me)\b/gi,
  /\bwhat(?:'?s| is| are)\b/gi,
  /\bhow\s+(?:much|many)\s+(?:is|are)\b/gi,
  /\b(?:work\s+out|figure\s+out|calculate|compute|evaluate|determine|give\s+me|show\s+me|tell\s+me)\b/gi,
  /\bthe\s+value\s+of\b/gi,
  /\bfor\s+me\b/gi,
  // Command verbs. Safe to drop: they say what to do, never what the maths is.
  /\b(?:solve|find)\b/gi,
  /\?+/g,
];

function stripStems(s: string): string {
  for (const re of STEMS) s = s.replace(re, ' ');
  return s;
}

/* -------------------------------------------------------------- operators */

function operators(s: string): string {
  return s
    .replace(/\bmultiplied\s+by\b|\btimes\b/gi, ' × ')
    .replace(/\bdivided\s+by\b/gi, ' ÷ ')
    .replace(/\b(?:added\s+to|plus)\b/gi, ' + ')
    .replace(/\b(?:subtract(?:ed)?\s+by|take\s+away|minus|less)\b/gi, ' - ')
    .replace(/\b(?:is\s+equal\s+to|equals?)\b/gi, ' = ')
    .replace(/\bsquare\s+root\s+of\s+/gi, 'sqrt ')
    // Powers bind to the term before them, so swallow the preceding space.
    .replace(/\s*\bsquared\b/gi, '^2')
    .replace(/\s*\bcubed\b/gi, '^3')
    .replace(/\s*\bto\s+the\s+power\s+(?:of\s+)?(-?\d+)/gi, '^$1')
    .replace(/\s*\braised\s+to\s+(?:the\s+)?(-?\d+)/gi, '^$1');
}

/** Units of length/area attached to a number carry no algebraic meaning. */
function stripUnits(s: string): string {
  return s.replace(
    /(\d)\s*(?:cm|mm|km|centimetres?|centimeters?|metres?|meters?|kilometres?|kilometers?|feet|foot|ft|degrees?|°)\b/gi,
    '$1',
  );
}

/* ------------------------------------------------------- topic vocabulary */

/** `radius of 5`, `radius = 5`, `radius 5` → `r=5` */
function labelled(s: string, words: string, key: string): string {
  const re = new RegExp(`\\b(?:${words})\\b\\s*(?:of|is|are|=|:)?\\s*(-?\\d*\\.?\\d+)`, 'gi');
  return s.replace(re, `${key}=$1`);
}

function measurement(s: string): string {
  // Diameter has to be halved, so it can't use the plain label mapping.
  s = s.replace(
    /\bdiameter\b\s*(?:of|is|=|:)?\s*(-?\d*\.?\d+)/gi,
    (_m, n: string) => `r=${Number(n) / 2}`,
  );
  s = labelled(s, 'radius|radii', 'r');
  s = labelled(s, 'slant\\s+height', 'l');
  s = labelled(s, 'height|tall|deep|depth', 'h');
  s = labelled(s, 'length|long', 'l');
  s = labelled(s, 'width|wide|breadth', 'w');
  s = labelled(s, 'perpendicular\\s+height', 'h');
  return s;
}

function trigonometry(s: string): string {
  const isRight = /\bright[\s-]?angled?\b|\bright\s+triangle\b|\bhypotenuse\b/i.test(s);

  s = labelled(s, 'hypotenuse|hyp', 'c');
  s = labelled(s, 'opposite|opp', 'a');
  s = labelled(s, 'adjacent|adj', 'b');

  // "sides 7 and 9" → the two sides either side of the included angle.
  s = s.replace(
    /\bsides?\b\s*(?:of\s*)?(-?\d*\.?\d+)\s*(?:,|and|&)\s*(-?\d*\.?\d+)\s*(?:,|and|&)\s*(-?\d*\.?\d+)/gi,
    'a=$1, b=$2, c=$3',
  );
  s = s.replace(
    /\bsides?\b\s*(?:of\s*)?(-?\d*\.?\d+)\s*(?:,|and|&)\s*(-?\d*\.?\d+)/gi,
    'a=$1, b=$2',
  );

  // An "included"/"between them" angle is always C; otherwise depends on shape.
  s = s.replace(
    /\b(?:included\s+angle|angle\s+between\s+them)\b\s*(?:of|is|=|:)?\s*(-?\d*\.?\d+)/gi,
    'C=$1',
  );
  s = s.replace(
    /\bangle\s+([ABC])\b\s*(?:of|is|=|:)?\s*(-?\d*\.?\d+)/gi,
    (_m, letter: string, n: string) => `${letter}=${n}`,
  );
  s = s.replace(
    /\bangle\b\s*(?:of|is|=|:)?\s*(-?\d*\.?\d+)/gi,
    (_m, n: string) => `${isRight ? 'A' : 'C'}=${n}`,
  );
  // A trailing "between them" once the angle is already captured.
  s = s.replace(/\bbetween\s+them\b/gi, ' ');
  return s;
}

function sequences(s: string): string {
  // "first term 5" means a₁ = 5, not "the 1st term", so claim it before the
  // ordinal rule below can read "first term" as a position.
  s = labelled(s, 'first\\s+term', 'a');
  s = labelled(s, 'common\\s+difference', 'd');
  s = labelled(s, 'common\\s+ratio', 'r');

  s = s.replace(/\bfirst\s+(\d+)\s+terms?\b/gi, 'n=$1');
  s = s.replace(/\b(\d+)\s*(?:st|nd|rd|th)\s+term\b/gi, 'n=$1');
  s = s.replace(
    new RegExp(`\\b(${Object.keys(ORDINALS).join('|')})\\s+term\\b`, 'gi'),
    (_m, w: string) => `n=${ORDINALS[w.toLowerCase()]}`,
  );
  return s;
}

function statistics(s: string): string {
  s = labelled(s, 'standard\\s+deviation|std\\s*dev|sigma', 'sd');
  s = labelled(s, 'sample\\s+size', 'n');
  s = s.replace(/\bmean\b\s*(?:of|is|=|:)?\s*(-?\d*\.?\d+)/gi, 'mean=$1');
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*%\s*confidence\b/gi, 'confidence conf=$1');
  // "exactly 3 heads in 10 flips" → a binomial with x=3, n=10
  s = s.replace(/\bexactly\s+(-?\d+)\b/gi, 'x=$1');
  // Allow a describing word between the count and the noun: "10 coin flips".
  const TRIALS = 'trials?|flips?|tosses|throws|rolls|attempts|shots|games|people|students|items';
  s = s.replace(new RegExp(`\\b(?:in|out\\s+of)\\s+(\\d+)\\s*(?:\\w+\\s+)?(?:${TRIALS})\\b`, 'gi'), 'n=$1');
  s = s.replace(new RegExp(`\\b(\\d+)\\s*(?:\\w+\\s+)?(?:${TRIALS})\\b`, 'gi'), 'n=$1');
  return s;
}

function logarithms(s: string): string {
  s = s.replace(/\blog\s*(?:to\s+the\s+)?base\s*(\d+(?:\.\d+)?)\s*(?:of\s*)?/gi, 'log$1 ');
  s = s.replace(/\bnatural\s+log(?:arithm)?\s*(?:of\s*)?/gi, 'ln ');
  s = s.replace(/\blog\s+of\b/gi, 'log');
  return s;
}

function probability(s: string): string {
  // "3 out of 8" and "3 in 8" read as a probability when nothing else claims it.
  s = s.replace(/\bprobability\s+(?:of|that|is)?\s*/gi, 'probability ');
  s = s.replace(/\bchance\b/gi, 'probability');
  return s;
}

/* ---------------------------------------------------------------- tidying */

function tidy(s: string): string {
  return s
    // Articles and connectives carry no maths. `a` is also a real variable, so
    // never drop one that is being assigned a value.
    .replace(/\b(?:a|an|the)\b(?!\s*=)/gi, ' ')
    .replace(/\b(?:with|that|which|has|have|having|its|of)\b/gi, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*$/, '')
    .replace(/^\s*,\s*/, '')
    .trim();
}

/* ------------------------------------------------------------------- main */

/**
 * Rewrite a natural-language problem into canonical form.
 * Safe to call on already-canonical input.
 */
export function normalise(raw: string): Reading {
  const original = raw;
  let s = unicode(raw);

  s = stripStems(s);
  s = logarithms(s);
  s = wordNumbers(s);
  s = operators(s);
  s = stripUnits(s);
  s = measurement(s);
  s = trigonometry(s);
  s = sequences(s);
  s = statistics(s);
  s = probability(s);
  s = tidy(s);

  // Never hand back an empty string — the original is better than nothing.
  if (s.trim() === '') s = original.trim();

  const rewritten = squash(s) !== squash(original);
  return { text: s, rewritten };
}

/** Compare ignoring whitespace so cosmetic spacing isn't reported as a rewrite. */
function squash(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}
