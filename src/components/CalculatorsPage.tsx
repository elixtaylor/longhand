import { useEffect, useMemo, useRef, useState } from 'react';
import { CALCULATORS, type CalculatorRef } from '../data/calculators';
import { getSolver } from '../lib/engine/registry';

interface DirectoryItem {
  calculator: CalculatorRef;
  label: string;
  blurb: string;
  searchText: string;
}

/** Make everyday searches insensitive to punctuation and word order. */
function normaliseSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[×·]/g, ' x ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const DIRECTORY_GROUPS = CALCULATORS.map((group) => ({
  heading: group.heading,
  items: group.items.map((calculator): DirectoryItem => {
    const solver = getSolver(calculator.solverId);
    const method = solver?.methods.find(
      (candidate) => candidate.id === calculator.methodId,
    );
    const label = calculator.label ?? method?.name ?? calculator.methodId;
    const blurb =
      calculator.blurb ??
      method?.blurb ??
      'Open this calculator to get started.';

    return {
      calculator,
      label,
      blurb,
      searchText: normaliseSearch(
        [group.heading, label, blurb, method?.name, solver?.title]
          .filter(Boolean)
          .join(' '),
      ),
    };
  }),
}));

const TOTAL_CALCULATORS = DIRECTORY_GROUPS.reduce(
  (count, group) => count + group.items.length,
  0,
);

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
  const visibleGroups = useMemo(() => {
    const terms = normaliseSearch(query).split(/\s+/).filter(Boolean);
    return DIRECTORY_GROUPS.map((group) => ({
      ...group,
      items:
        topic !== 'all' && group.heading !== topic
          ? []
          : group.items.filter(
              (item) =>
                terms.length === 0 ||
                terms.every((term) => item.searchText.includes(term)),
            ),
    })).filter((group) => group.items.length > 0);
  }, [query, topic]);
  const visibleCount = visibleGroups.reduce(
    (count, group) => count + group.items.length,
    0,
  );
  const hasFilters = query.trim() !== '' || topic !== 'all';

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '');
      if (event.key !== '/' || isTyping) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  function showAllCalculators() {
    setQuery('');
    setTopic('all');
  }

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

      <section className="calculator-directory-intro">
        <p className="calculator-directory-eyebrow">
          {TOTAL_CALCULATORS} focused tools
        </p>
        <h1>Choose a calculator</h1>
        <p>
          Browse by topic or search for the exact result you need. Each tool
          opens with the right fields and method already selected.
        </p>
      </section>

      <section
        className="calculator-directory-tools"
        aria-label="Find a calculator"
      >
        <label className="sr-only" htmlFor="calculator-search-input">
          Search calculators
        </label>
        <div className="calculator-search">
          <svg
            className="calculator-search-icon"
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="8.5" cy="8.5" r="5.25" />
            <path d="m12.5 12.5 4 4" />
          </svg>
          <input
            ref={searchRef}
            id="calculator-search-input"
            type="search"
            placeholder="Search tools or tasks"
            autoComplete="off"
            aria-keyshortcuts="/"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className="calculator-search-clear"
              aria-label="Clear calculator search"
              onClick={() => setQuery('')}
            >
              Clear
            </button>
          )}
        </div>
        <p className="calculator-result-count" role="status" aria-live="polite">
          {hasFilters
            ? `${visibleCount} of ${TOTAL_CALCULATORS} calculators`
            : `${visibleCount} ${visibleCount === 1 ? 'calculator' : 'calculators'}`}
        </p>
      </section>

      <div className="calculator-browser">
        <nav className="calculator-topic-nav" aria-label="Calculator topics">
          <p className="calculator-topic-nav-label">Topics</p>
          <button
            type="button"
            aria-pressed={topic === 'all'}
            onClick={() => setTopic('all')}
          >
            <span>All calculators</span>
            <span>{TOTAL_CALCULATORS}</span>
          </button>
          {DIRECTORY_GROUPS.map((group) => (
            <button
              type="button"
              key={group.heading}
              aria-pressed={topic === group.heading}
              onClick={() => setTopic(group.heading)}
            >
              <span>{group.heading}</span>
              <span>{group.items.length}</span>
            </button>
          ))}
        </nav>

        <div className="calculator-results">
          {visibleGroups.map((group) => {
            const headingId = `calculator-group-${group.heading
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')}`;
            return (
              <section
                className="calculator-group"
                aria-labelledby={headingId}
                key={group.heading}
              >
                <header className="calculator-group-heading">
                  <h2 id={headingId}>{group.heading}</h2>
                  <span>
                    {group.items.length}{' '}
                    {group.items.length === 1 ? 'tool' : 'tools'}
                  </span>
                </header>
                <div className="calculator-directory">
                  {group.items.map(({ calculator, label, blurb }) => (
                    <button
                      type="button"
                      className="calculator-card"
                      key={`${calculator.solverId}-${calculator.methodId}`}
                      onClick={() => onOpenCalculator(calculator)}
                    >
                      <span className="calculator-card-copy">
                        <span className="calculator-card-label">{label}</span>
                        <span className="calculator-card-blurb">{blurb}</span>
                      </span>
                      <span
                        className="calculator-card-arrow"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}

          {visibleCount === 0 && (
            <section className="calculator-directory-empty">
              <p className="calculator-directory-eyebrow">No matches</p>
              <h2>No calculators found</h2>
              <p>Try a broader search or return to the full topic list.</p>
              {hasFilters && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={showAllCalculators}
                >
                  Show all calculators
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
