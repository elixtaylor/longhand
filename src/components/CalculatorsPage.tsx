import { useMemo, useRef, useState } from 'react';
import { CALCULATORS, type CalculatorRef } from '../data/calculators';
import { getSolver } from '../lib/engine/registry';

export function CalculatorsPage({
  onReturn,
  onOpenCalculator,
}: {
  onReturn: () => void;
  onOpenCalculator: (calculator: CalculatorRef) => void;
}) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const calculators = CALCULATORS.flatMap((group) =>
    group.items.map((calculator) => ({ group: group.heading, calculator })),
  );
  const topics = [...new Set(calculators.map(({ group }) => group))];
  const visibleCalculators = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return calculators.filter(({ group, calculator }) => {
      if (topic !== 'all' && group !== topic) return false;
      if (!needle) return true;
      const solver = getSolver(calculator.solverId);
      const method = solver?.methods.find(
        (candidate) => candidate.id === calculator.methodId,
      );
      return [
        group,
        calculator.label,
        calculator.blurb,
        method?.name,
        solver?.title,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [calculators, query, topic]);

  return (
    <main className="page-shell calculators-page">
      <header className="graphing-header">
        <div className="graphing-header-left">
          <button
            type="button"
            className="return-btn"
            aria-label="Return to equation input"
            onClick={onReturn}
          >
            ← Return
          </button>
          <span className="graphing-kicker">Calculators</span>
        </div>
      </header>

      <div className="calculator-directory-tools">
        <div className="calculator-search">
          <button
            type="button"
            className="calculator-search-icon"
            aria-label="Focus calculator search"
            onClick={() => searchRef.current?.focus()}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <circle cx="8.5" cy="8.5" r="5.25" />
              <path d="m12.5 12.5 4 4" />
            </svg>
          </button>
          <input
            ref={searchRef}
            type="search"
            aria-label="Search calculators"
            placeholder="Search calculators"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <label className="calculator-filter">
          <span className="sr-only">Filter calculators</span>
          <select
            aria-label="Filter calculators"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          >
            <option value="all">All topics</option>
            {topics.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="calculator-directory" aria-live="polite">
        {visibleCalculators.map(({ group, calculator }) => {
          const solver = getSolver(calculator.solverId);
          const method = solver?.methods.find(
            (candidate) => candidate.id === calculator.methodId,
          );
          return (
            <button
              type="button"
              className="calculator-card"
              key={`${calculator.solverId}-${calculator.methodId}`}
              onClick={() => onOpenCalculator(calculator)}
            >
              <span className="calculator-card-topic">{group}</span>
              <span className="calculator-card-label">
                {calculator.label ?? method?.name ?? calculator.methodId}
              </span>
              <span className="calculator-card-solver">
                {solver?.title ?? 'Calculator'}
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
