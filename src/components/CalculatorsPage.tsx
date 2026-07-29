import { CALCULATORS, type CalculatorRef } from '../data/calculators';
import { getSolver } from '../lib/engine/registry';

export function CalculatorsPage({
  onReturn,
  onOpenCalculator,
}: {
  onReturn: () => void;
  onOpenCalculator: (calculator: CalculatorRef) => void;
}) {
  const calculators = CALCULATORS.flatMap((group) =>
    group.items.map((calculator) => ({ group: group.heading, calculator })),
  );

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

      <div className="calculator-directory">
        {calculators.map(({ group, calculator }) => {
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
