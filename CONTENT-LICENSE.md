# Content licences

Longhand's **code** and all of its **worked solutions** are original. The engine
computes every step itself; no solutions have been copied from anywhere.

Some **practice questions** are imported from openly-licensed textbooks. Those are
listed in `src/data/imported.ts`, and every entry records its exact source and
section so the attribution travels with the problem.

## OpenStax — *Algebra and Trigonometry 2e*

- **Publisher:** OpenStax, Rice University
- **URL:** https://openstax.org/books/algebra-and-trigonometry-2e
- **Licence:** [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- **Sections used:** §2.5 Quadratic Equations, §10.2 Non-right Triangles: Law of
  Cosines, §11.1 Systems of Linear Equations: Two Variables

Questions are reproduced as printed. Where a question was adapted, the change is
noted in its `ref` field (for example, `§2.5 Ex 30 (p→x)` marks a variable rename).
Questions the engine cannot yet handle — cubics, equations in `1/x²`,
parenthesised fractional coefficients — were left out rather than rewritten.

### What this licence means for Longhand

Three obligations come with CC BY-NC-SA 4.0:

1. **Attribution** — OpenStax must be credited. This is done in the app footer, in
   this file, and per-problem in `src/data/imported.ts`.
2. **NonCommercial** — this content may not be used for commercial purposes. **If
   Longhand is ever sold, put behind a paywall, or run with advertising, the
   imported questions must be removed first.** Nothing else in the project is
   affected: the code, the engine, the solutions and the hand-written examples in
   `src/data/examples.ts` carry no such restriction.
3. **ShareAlike** — adaptations of *that content* must carry the same licence.

To strip the imported content, delete `src/data/imported.ts` and the places that
read it. The app degrades cleanly: it falls back to the hand-written examples.
