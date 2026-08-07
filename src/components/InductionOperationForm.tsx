import { useState } from 'react';
import { inductionSolver } from '../solvers/specialist/induction';
import { CalculatorPreview } from './CalculatorPreview';

type Domain = 'natural' | 'integer';

/**
 * A focused calculator for proofs by mathematical induction (PMI).
 * The visible controls describe the proposition; the solver supplies the
 * proof structure and checks the polynomial identity in the inductive step.
 */
export function InductionOperationForm({
  onSubmit,
}: {
  onSubmit: (serialized: string) => void;
}) {
  const [summand, setSummand] = useState('');
  const [start, setStart] = useState('1');
  const [domain, setDomain] = useState<Domain>('natural');

  const startNumber = Number(start.trim());
  const validStart = start.trim() !== '' && Number.isSafeInteger(startNumber);
  const complete =
    summand.trim() !== '' &&
    validStart &&
    (domain === 'integer' || startNumber >= 0);
  const serialized = complete
    ? `sum ${summand.trim()} from r=${startNumber} to n domain=${domain}`
    : '';
  const liveResult = complete ? inductionSolver.solve(serialized, 'sum') : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (complete) onSubmit(serialized);
  }

  return (
    <form className="structured-form induction-form" onSubmit={submit}>
      <div className="structured-field">
        <label className="field-label" htmlFor="induction-summand">
          Summand f(r)
        </label>
        <input
          id="induction-summand"
          className="expr-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="e.g. r^2"
          value={summand}
          onChange={(event) => setSummand(event.target.value)}
        />
      </div>

      <div className="number-fields induction-number-fields">
        <div className="number-field">
          <label className="field-label" htmlFor="induction-start">
            Start n₀
          </label>
          <input
            id="induction-start"
            className="expr-input num-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Start n₀"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>

        <div className="number-field">
          <label className="field-label" htmlFor="induction-domain">
            Domain
          </label>
          <select
            id="induction-domain"
            className="induction-domain-select"
            aria-label="Induction domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value as Domain)}
          >
            <option value="natural">n ∈ ℕ, n ≥ n₀</option>
            <option value="integer">n ∈ ℤ, n ≥ n₀</option>
          </select>
        </div>
      </div>

      {validStart && domain === 'natural' && startNumber < 0 && (
        <p className="field-error" role="alert">
          Natural-number induction must start at 0 or above.
        </p>
      )}

      <CalculatorPreview result={liveResult} />

      <button type="submit" className="btn-primary" disabled={!complete}>
        Show the proof
      </button>
    </form>
  );
}
