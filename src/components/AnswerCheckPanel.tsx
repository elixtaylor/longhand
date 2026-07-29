import { useEffect, useState } from 'react';
import type { Worked } from '../lib/engine/run';
import { checkAnswer, type CheckResult } from '../lib/checking';

export function AnswerCheckPanel({
  input,
  worked,
}: {
  input: string;
  worked: Worked | null;
}) {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [partIndex, setPartIndex] = useState(0);
  useEffect(() => {
    setAnswer('');
    setResult(null);
    setPartIndex(0);
  }, [input]);
  const parts = worked?.parts ?? [];
  const part = parts[partIndex] ?? null;
  const expected = part?.result.ok
    ? part.result.solution.answerLatex
    : undefined;
  return (
    <form
      className="sidebar-tool"
      onSubmit={(event) => {
        event.preventDefault();
        setResult(checkAnswer(expected, answer));
      }}
    >
      {parts.length > 1 && (
        <select
          className="sidebar-tool-input"
          aria-label="Problem part"
          value={partIndex}
          onChange={(event) => {
            setPartIndex(Number(event.target.value));
            setAnswer('');
            setResult(null);
          }}
        >
          {parts.map((candidate, index) => (
            <option key={candidate.label} value={index}>
              Part {candidate.label}
            </option>
          ))}
        </select>
      )}
      <input
        className="sidebar-tool-input"
        aria-label="Your answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="e.g. x = 3"
        disabled={!part}
      />
      <button
        className="btn-primary"
        type="submit"
        disabled={!part || answer.trim() === ''}
      >
        Check answer
      </button>
      {result && (
        <p className={`check-result check-${result.status}`} role="status">
          {result.message}
        </p>
      )}
    </form>
  );
}
