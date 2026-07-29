import { fmt } from './num';

/** Convert the simple exact forms used in worked solutions to decimals. */
export function decimaliseLatex(tex: string): string {
  return tex
    .replace(
      /\\(?:dfrac|tfrac|frac)\{(-?(?:\d+\.?\d*|\.\d+))\}\{(-?(?:\d+\.?\d*|\.\d+))\}/g,
      (_match, numerator: string, denominator: string) => {
        const value = Number(numerator) / Number(denominator);
        return Number.isFinite(value) ? fmt(value, 6) : _match;
      },
    )
    .replace(/\\sqrt\{(\d+(?:\.\d+)?)\}/g, (match, radicand: string) => {
      const value = Math.sqrt(Number(radicand));
      return Number.isFinite(value) ? fmt(value, 6) : match;
    });
}
