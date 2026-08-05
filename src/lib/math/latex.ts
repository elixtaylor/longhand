/** Wrap a LaTeX term in the single red used for balancing operations. */
export function redLatex(tex: string): string {
  // `\\color{red}{...}` leaks its colour through subsequent KaTeX atoms in
  // some output modes. `\\textcolor` keeps the span explicitly bounded.
  return `\\textcolor{red}{${tex}}`;
}

/** Colour an entire signed operation, including its + or − sign. */
export function redSignedLatex(sign: '+' | '-', tex: string): string {
  return redLatex(`${sign} ${tex}`);
}
