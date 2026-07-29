import { useState } from 'react';
import { examples, type Example } from '../data/examples';
import { getSolver } from '../lib/engine/registry';
import { runSolve } from '../lib/engine/run';
import { TeX } from './TeX';

export function PracticePanel({
  onOpenExample,
}: {
  onOpenExample: (example: Example) => void;
}) {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * examples.length),
  );
  const [revealed, setRevealed] = useState(false);
  const example = examples[index];
  const solver = getSolver(example.solverId);
  const result = solver
    ? runSolve(
        solver,
        example.input,
        example.methodId ?? solver.defaultMethodId,
      )
    : null;
  function next() {
    setIndex((current) => (current + 1) % examples.length);
    setRevealed(false);
  }
  return (
    <div className="sidebar-tool">
      <span className="practice-subject">{example.subject}</span>
      <p className="practice-prompt">{example.label}</p>
      {revealed && result?.ok && result.solution.answerLatex && (
        <p className="practice-answer">
          <TeX tex={result.solution.answerLatex} />
        </p>
      )}
      <div className="practice-actions">
        <button type="button" className="btn" onClick={next}>
          Another
        </button>
        <button type="button" className="btn" onClick={() => setRevealed(true)}>
          Reveal answer
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onOpenExample(example)}
        >
          Try it
        </button>
      </div>
    </div>
  );
}
