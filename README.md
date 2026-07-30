# Longhand

### → [elixtaylor.github.io/longhand](https://elixtaylor.github.io/longhand/)

**SACE maths, worked line by line.** Enter a problem, pick the method you were taught, and get
correct, step-by-step working — with your choice of method.

Longhand computes every step itself with a purpose-built, deterministic engine. There is **no AI
in the output**: the engine is deterministic (no generated arithmetic slips), it runs entirely in the
browser, and it reads like real maths rather than generated prose. Exact answers can be switched
to decimal display from Settings.

## Just ask in plain English

You don't have to learn a syntax. Type the question the way you'd say it:

> _"what is the volume of a cylinder with radius 3 and height 10"_
> _"a triangle with sides 7 and 9 and an included angle of 40 degrees"_
> _"solve x squared plus 5x plus 6 equals 0"_
> _"if I invest $5000 at 4% for 3 years compounded monthly"_
> _"probability of exactly 3 heads in 10 coin flips"_

Longhand rewrites that into maths, shows you **exactly how it read your question**,
works out **which topic it belongs to**, and solves it — there is nothing to select.
If the reading is wrong you can see why straight away. Structured input
(`a=7, b=9, C=40`) works exactly as before.

## Questions that span two topics

School questions don't respect topic boundaries, so neither does Longhand. Ask

> _"solve x² + 5x + 6 = 0 then differentiate it"_

and it works part **(a)** in quadratics and part **(b)** in calculus, telling you it read
"it" as `x² + 5x + 6` so you can check that's what you meant. Later parts can use earlier
answers — _"…and then find 20% of the answer"_, _"…15% of the larger root"_.

A split has to prove itself: every piece must independently detect a topic **and** solve.
That's what stops _"a triangle with sides 5, 6 and 7"_ being torn in half at the "and".
Picking a method, or reopening a past problem, settles the question on one topic and
turns splitting off until the question changes.

Some questions need two topics at once rather than one after the other — the gradient at a
point, stationary points and their nature, tangents and normals. Those are a topic of their
own, so the working shows the join: differentiate, solve what you differentiated, interpret.

## Other things it does

- **Compare all methods** — every method for the same problem side by side, with a
  step count for each and a check that they agree. The whole point of the app, in one view.
- **Compact sidebar** — calculators, textbook questions, recent work and settings are one click
  away. Calculators open in a dedicated directory page grouped by topic.
- **Maths first** — the working shows lines only. **Why?**, top right, adds the reason
  for each line when you want it.
- **No duplicate methods** — if two methods give identical working for your problem
  (solving `ln x = 5` is the same either way), only one is offered.
- **Data-driven visuals** — parabolas with roots and turning points marked, shaded normal
  curves, box plots, and number lines for inequalities.
- **Measurement units** — length units are converted consistently and answers carry the
  correct linear, square or cubic dimension.
- **Graphing workspace** — plot multiple `y = f(x)` expressions, add x-coordinates, and see
  the calculated y-values and labelled table points on the graph.
- **Shareable links** — every solve updates the URL, so you can send working to a
  classmate or hand it to a teacher.
- **Recent problems**, kept locally so you can pick up where you left off.
- **Light and dark**, with Mono (black, grey and white) as the default theme, plus Editorial,
  Notebook and Warm alternatives.
- **Keyboard**: `/` jumps to the problem box, `,` opens the menu.

## Topics & methods

Covering SACE Stage 1 and Stage 2 (Years 11–12).

| Subject         | Topic                                | Methods you can choose                                                                                                    |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Foundations** | Multiplication                       | Grid / box · Column (long)                                                                                                |
|                 | Division                             | Short (bus-stop) · Long division · Chunking                                                                               |
|                 | Fractions                            | Common denominator (+ − × ÷)                                                                                              |
|                 | Percentages                          | Decimal multiplier · Unitary · Reverse                                                                                    |
| **General**     | Linear equations                     | Balancing · Backtracking                                                                                                  |
|                 | Simultaneous equations               | Elimination · Substitution                                                                                                |
|                 | Networks                             | Shortest path (Dijkstra) · Minimum spanning tree (Kruskal)                                                                |
|                 | Investing & borrowing                | Compound · Simple · Depreciation · Loan repayments                                                                        |
|                 | Measurement                          | Area · Perimeter · Volume · Surface area                                                                                  |
|                 | Right-angled triangles               | Pythagoras · SOH CAH TOA                                                                                                  |
|                 | Sine & cosine rules                  | Sine rule · Cosine rule · Area (½ab sin C, Heron)                                                                         |
|                 | Statistics                           | Full summary · Centre · Spread · Five-number summary                                                                      |
|                 | Matrices                             | Add · Subtract · Multiply · Determinant · Inverse · Transpose · Matrix systems                                            |
| **Methods**     | Gradients, tangents & turning points | Stationary points · Gradient at a point · Tangent · Normal                                                                |
|                 | Inequalities                         | Balancing (with sign flip) · Sign diagram                                                                                 |
|                 | Quadratic equations                  | Factorising · Completing the square · Quadratic formula                                                                   |
|                 | Polynomials                          | Factor theorem · Division · Remainder theorem                                                                             |
|                 | Logs & exponentials                  | Equating indices · Taking logs                                                                                            |
|                 | Sketching curves                     | Key features · Using calculus                                                                                             |
|                 | Trigonometric equations              | Unit circle                                                                                                               |
|                 | Differentiation                      | Power rule · Product/quotient/chain · First principles                                                                    |
|                 | Integration                          | Reverse power rule · Definite integral · Substitution · Integration by parts · Area between curves · Volume of revolution |
|                 | Geometric proof                      | Triangle angle sum · Parallel lines · Isosceles · Congruence · Circle theorems                                            |
|                 | Probability                          | Single event · Union · Intersection · Conditional                                                                         |
|                 | Counting & combinations              | Combination (nCr) · Permutation (nPr) · Factorial                                                                         |
|                 | Binomial expansion                   | Binomial theorem                                                                                                          |
|                 | Random variables                     | Binomial · Normal tails and intervals · Sampling distributions · Confidence interval                                      |
| **Specialist**  | Indices & surds                      | Simplify surd · Rationalise · Index laws                                                                                  |
|                 | Sequences & series                   | Arithmetic · Geometric (incl. limiting sum)                                                                               |
|                 | Growth, decay & rates                | Exponential model · Half-life / doubling                                                                                  |
|                 | Vectors                              | Component form (dot, cross, magnitude, angle)                                                                             |
|                 | Complex numbers                      | Rectangular form · Polar form                                                                                             |
|                 | Mathematical induction               | Base case → assumption → inductive step                                                                                   |

Terminology and methods follow **SACE** (Foundations / General / Methods / Specialist).
Induction derives the closed form itself, so the proof is always of a true statement.

The exact Stage 1 and Stage 2 Methods/Specialist topic list is kept in
[`src/data/curriculum.ts`](src/data/curriculum.ts) and checked by
`src/data/curriculum.test.ts`. A topic may point to more than one solver where
the SACE question genuinely combines topics.

## Design

Four complete, switchable themes (Settings → Theme), default **Mono**:

- **Mono** — modern black, grey and white with a restrained accent.
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
npm run deploy     # build + publish to GitHub Pages
```

It builds to a static bundle in `dist/`, so it can be hosted anywhere (Vercel, Netlify, GitHub
Pages, any static host). No backend, no API keys, works offline.

## Privacy, security and contributing

- [Privacy](PRIVACY.md): problems stay in browser storage; shared links contain the question.
- [Security policy](SECURITY.md): how to report a suspected issue responsibly.
- [Contributing](CONTRIBUTING.md): solver and validation conventions.
- [MIT licence](LICENSE): applies to the original code and worked solutions. Imported textbook questions remain subject to [their separate content licence](CONTENT-LICENSE.md).

Asset paths are relative (`base: './'` in `vite.config.ts`), so the same build runs at a domain
root or under a subpath — state lives in the URL hash, never the path. `npm run deploy` pushes
`dist/` to the `gh-pages` branch; see `scripts/deploy.sh`.

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

| Topic                         | Checked against                                        |
| ----------------------------- | ------------------------------------------------------ |
| Quadratics, polynomials       | Substituting each root back into the equation          |
| Differentiation               | A central finite difference                            |
| Integration                   | Simpson's rule, and differentiating the result back    |
| Linear, simultaneous          | Substituting the solution into every original equation |
| Inequalities                  | Testing points inside and outside the claimed region   |
| Right triangles               | Pythagoras                                             |
| Sine & cosine rules           | The law of cosines, and Heron's formula                |
| Compound interest             | Year-by-year iterative accumulation                    |
| Combinations                  | Pascal's triangle recurrence                           |
| Fractions, surds, percentages | Floating-point value, and forward/reverse round-trips  |

Because the seed is fixed, any failure reproduces exactly.

The _shape_ of the working is checked too, across every example in the library: no step may
be blank, repeat the line above it, or go unexplained. And any arithmetic written into a
step ("126 × 0.766044 = 96.5216") must actually hold to the figures shown — a line a student
can't reproduce on a calculator is worse than no line at all.

Steps that _justify_ the next line are tested by name, because they are the ones easiest to
leave out: `ln x = 5` must show `e^{ln x} = e^5` before `x = e^5`, balancing must write the
operation on both sides before the tidy-up, and Pythagoras must square, add and root on
separate lines.

## Practice questions

Longhand writes all of its own working. Some **questions** come from openly-licensed
textbooks, each recorded with its exact source and section — see
[CONTENT-LICENSE.md](CONTENT-LICENSE.md). Every imported question is tested: it must
solve, and its answer is re-derived independently before it ships.

> **If you ever sell Longhand or run ads on it,** delete `src/data/imported.ts` first —
> that content is NonCommercial. Nothing else in the project is restricted.

## Scope notes

Deliberately out of scope for now: photo/handwriting input; statistical _investigations_ and the
open-ended modelling topics (which are written up, not computed). Affine substitution, bracket expansion, and mixed algebra/trigonometry equations are
worked as overlapping techniques, with the intermediate algebra shown rather than hidden.

Natural language covers the phrasings students actually use, not arbitrary prose — it is a
deterministic rewriter, not a language model. When it can't read something it says so and shows
you what it understood, rather than guessing.
