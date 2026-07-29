# Contributing

- Keep solvers deterministic and browser-only.
- Put natural-language rewrites in `src/lib/nl/normalise.ts`, not individual solvers.
- Every solver needs honest detection, useful failure messages and worked-line tests.
- Add regression tests for parser, detector and solution changes. Run `npm run lint`, `npm test` and `npm run build` before opening a pull request.
- Do not add externally sourced questions without attribution and licence review.
