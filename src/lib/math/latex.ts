/** Wrap a LaTeX term in the single red used for balancing operations. */
export function redLatex(tex: string): string {
  return `\\color{red}{${tex}}`;
}
