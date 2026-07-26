# Longhand

**SACE maths, worked line by line.** Enter a problem, pick the method you were taught, and get
correct, step-by-step working — with your choice of method.

Longhand computes every step itself with a purpose-built, deterministic engine. There is **no AI
in the output**: the working is always exact (no arithmetic slips), it runs entirely in the
browser, and it reads like real maths rather than generated prose.

## Just ask in plain English

You don't have to learn a syntax. Type the question the way you'd say it:

> *"what is the volume of a cylinder with radius 3 and height 10"*
> *"a triangle with sides 7 and 9 and an included angle of 40 degrees"*
> *"solve x squared plus 5x plus 6 equals 0"*
> *"if I invest $5000 at 4% for 3 years compounded monthly"*
> *"probability of exactly 3 heads in 10 coin flips"*

Longhand rewrites that into maths, shows you **exactly how it read your question**,
works out **which topic it belongs to**, and solves it. If the reading is wrong you can
see why straight away. Structured input (`a=7, b=9, C=40`) works exactly as before, and
**Choose topic** lets you pick one yourself.

## Other things it does

- **Compare all methods** — every method for the same problem side by side, with a
  step count for each and a check that they agree. The whole point of the app, in one view.
- **Diagrams** — scale triangles, parabolas with roots and turning points marked, shaded
  normal curves, box plots, and number lines for inequalities.
- **Formula sheet** for the current topic, always alongside the working.
- **Shareable links** — every solve updates the URL, so you can send working to a
  classmate or hand it to a teacher.
- **Recent problems**, kept locally so you can pick up where you left off.
- **Light and dark**, with each theme keeping its own character after dark.
- **Keyboard**: `/` jumps to the problem box, `,` opens settings.
- **Print** produces a clean worked solution with the controls stripped out.

## Topics & methods

Covering SACE Stage 1 and Stage 2 (Years 11–12).

| Subject | Topic | Methods you can choose |
|---|---|---|
| **Foundations** | Multiplication | Grid / box · Column (long) |
| | Division | Short (bus-stop) · Long division · Chunking |
| | Fractions | Common denominator (+ − × ÷) |
| | Percentages | Decimal multiplier · Unitary · Reverse |
| **General** | Linear equations | Balancing · Backtracking |
| | Simultaneous equations | Elimination · Substitution |
| | Networks | Shortest path (Dijkstra) · Minimum spanning tree (Kruskal) |
| | Investing & borrowing | Compound · Simple · Depreciation · Loan repayments |
| | Measurement | Area · Perimeter · Volume · Surface area |
| | Right-angled triangles | Pythagoras · SOH CAH TOA |
| | Sine & cosine rules | Sine rule · Cosine rule · Area (½ab sin C, Heron) |
| | Statistics | Full summary · Centre · Spread · Five-number summary |
| | Matrices | Add · Multiply · Determinant · Inverse |
| **Methods** | Inequalities | Balancing (with sign flip) · Sign diagram |
| | Quadratic equations | Factorising · Completing the square · Quadratic formula |
| | Polynomials | Factor theorem · Division · Remainder theorem |
| | Logs & exponentials | Equating indices · Taking logs |
| | Sketching curves | Key features · Using calculus |
| | Trigonometric equations | Unit circle |
| | Differentiation | Power rule · Product/quotient/chain · First principles |
| | Integration | Reverse power rule · Definite integral |
| | Probability | Single event · Union · Intersection · Conditional |
| | Counting & combinations | Combination (nCr) · Permutation (nPr) · Factorial |
| | Random variables | Binomial · Normal · Confidence interval |
| **Specialist** | Indices & surds | Simplify surd · Rationalise · Index laws |
| | Sequences & series | Arithmetic · Geometric (incl. limiting sum) |
| | Growth, decay & rates | Exponential model · Half-life / doubling |
| | Vectors | Component form (dot, cross, magnitude, angle) |
| | Complex numbers | Rectangular form · Polar form |
| | Mathematical induction | Base case → assumption → inductive step |

Terminology and methods follow **SACE** (Foundations / General / Methods / Specialist).
Induction derives the closed form itself, so the proof is always of a true statement.

## Design

Three complete, switchable themes (Settings → Theme), default **Editorial**:

- **Editorial** — clean textbook: warm paper, serif headings, deep-teal accent.
- **Notebook** — squared exercise-book paper with fountain-pen ink and red-pen annotations.
- **Warm** — a friendly study-app look in cream and forest green.

The look is deliberately un-templated: no purple gradients, no glassmorphism, intentional system
typography, and hand-built domain visuals (the long-division bracket, the multiplication grid).

## Running it

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
npm run test       # run the solver test suite (Vitest)
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

It builds to a static bundle in `dist/`, so it can be hosted anywhere (Vercel, Netlify, GitHub
Pages, any static host). No backend, no API keys, works offline.

## How it's built

- **Vite + React + TypeScript**, **KaTeX** for maths rendering. No runtime backend.
- Exact **rational arithmetic** and a small **polynomial parser** keep every step correct
  (`src/lib/math`). `expr.ts` adds a compact expression engine — parse → differentiate →
  simplify → LaTeX — for the product, quotient and chain rules. `roots.ts` finds real roots
  the way a student would: rational roots first, then the quadratic formula, then bisection.
- **Natural language** is normalised once, at a single boundary (`src/lib/nl/normalise.ts`,
  applied in `src/lib/engine/run.ts`), so all 30 topics get plain-English input without 30
  separate parsers. Canonical input passes through untouched.
- Each topic is an isolated **Solver** exposing one or more **Methods** plus a `detect()`
  confidence score (`src/solvers/**`), wired up in `src/lib/engine/registry.ts`. Adding a topic
  is one new file plus one line in the registry.
- **Auto-detection** asks every solver how well it matches the input and takes the strongest
  answer (`detectSolver` in the registry).
- Correctness is proven by tests: every method is checked against known worked examples, methods
  that solve the same problem are asserted to agree, every example in the library is solved,
  plain-English phrasings are solved end to end, and every detector is fuzzed against
  cross-topic inputs for hangs (`npm run test`).

## How the answers are checked

Hand-written test cases only prove the answers someone thought to check, so
`src/validation/` generates hundreds of problems from a seeded RNG and verifies each
against an **independent** source of truth — never against the engine itself:

| Topic | Checked against |
|---|---|
| Quadratics, polynomials | Substituting each root back into the equation |
| Differentiation | A central finite difference |
| Integration | Simpson's rule, and differentiating the result back |
| Linear, simultaneous | Substituting the solution into every original equation |
| Inequalities | Testing points inside and outside the claimed region |
| Right triangles | Pythagoras |
| Sine & cosine rules | The law of cosines, and Heron's formula |
| Compound interest | Year-by-year iterative accumulation |
| Combinations | Pascal's triangle recurrence |
| Fractions, surds, percentages | Floating-point value, and forward/reverse round-trips |

Because the seed is fixed, any failure reproduces exactly.

## Practice questions

Longhand writes all of its own working. Some **questions** come from openly-licensed
textbooks, each recorded with its exact source and section — see
[CONTENT-LICENSE.md](CONTENT-LICENSE.md). Every imported question is tested: it must
solve, and its answer is re-derived independently before it ships.

> **If you ever sell Longhand or run ads on it,** delete `src/data/imported.ts` first —
> that content is NonCommercial. Nothing else in the project is restricted.

## Scope notes

Deliberately out of scope for now: photo/handwriting input; statistical *investigations* and the
open-ended modelling topics (which are written up, not computed); integration by parts and by
substitution; geometric proof. All fit the same solver interface when wanted.

Natural language covers the phrasings students actually use, not arbitrary prose — it is a
deterministic rewriter, not a language model. When it can't read something it says so and shows
you what it understood, rather than guessing.
