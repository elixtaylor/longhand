/** Limits that keep client-side parsing responsive and numerical working honest. */
export const MAX_INPUT_LENGTH = 2_000;
export const MAX_SHARE_INPUT_LENGTH = 2_000;
export const MAX_POLYNOMIAL_DEGREE = 100;
export const MAX_EXPONENT = 100;
export const MAX_AST_NODES = 1_000;

export function isSafeFiniteInteger(value: number): boolean {
  return Number.isSafeInteger(value);
}

export function assertInputLength(input: string): void {
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error(
      `That input is too long. Keep a single problem under ${MAX_INPUT_LENGTH.toLocaleString()} characters.`,
    );
  }
}
