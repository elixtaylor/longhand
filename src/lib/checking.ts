export type CheckStatus = 'correct' | 'incorrect' | 'unrecognised';

export interface CheckResult {
  status: CheckStatus;
  message: string;
}

function numericValues(value: string): number[] {
  const expanded = value
    .replace(/\\(?:dfrac|tfrac|frac)\{(-?[\d.]+)\}\{(-?[\d.]+)\}/g, (_, a, b) =>
      String(Number(a) / Number(b)),
    )
    .replace(/\\sqrt\{([\d.]+)\}/g, (_, n) => String(Math.sqrt(Number(n))));
  return (expanded.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

export function checkAnswer(
  expectedLatex: string | undefined,
  answer: string,
): CheckResult {
  if (!expectedLatex || answer.trim() === '')
    return { status: 'unrecognised', message: 'Enter an answer to check.' };
  const expectedNumbers = numericValues(expectedLatex);
  const actualNumbers = numericValues(answer);
  if (expectedNumbers.length > 0) {
    const sameLength = expectedNumbers.length === actualNumbers.length;
    const close =
      sameLength &&
      expectedNumbers.every(
        (value, i) =>
          Math.abs(value - actualNumbers[i]) <=
          1e-3 * Math.max(1, Math.abs(value)),
      );
    if (close) return { status: 'correct', message: 'Correct.' };
    return {
      status: 'incorrect',
      message: 'Not quite. Check the values and signs.',
    };
  }
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z]+/g, '');
  if (clean(expectedLatex) === clean(answer))
    return { status: 'correct', message: 'Correct.' };
  return {
    status: 'unrecognised',
    message: 'I could not compare that form yet.',
  };
}
