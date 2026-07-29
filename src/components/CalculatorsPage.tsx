import { CALCULATORS, type CalculatorRef } from '../data/calculators';
import { getSolver } from '../lib/engine/registry';

export function CalculatorsPage({
  onReturn,
  onOpenCalculator,
}: {
  onReturn: () => void;
  onOpenCalculator: (calculator: CalculatorRef) => void;
}) {
  return (
    <main className="page-shell calculators-page">
      <header className="page-header">
        <button type="button" className="return-btn" onClick={onReturn}>
          ← Return
        </button>
        <div>
          <span className="page-kicker">Longhand / Calculators</span>
          <h1>Calculators</h1>
        </div>
      </header>

      <div className="calculator-directory">
        {CALCULATORS.map((group) => (
          <section className="calculator-group" key={group.heading}>
            <h2>{group.heading}</h2>
            <div className="calculator-group-list">
              {group.items.map((calculator) => {
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
                    <span className="calculator-card-label">
                      {calculator.label ?? method?.name ?? calculator.methodId}
                    </span>
                    <span className="calculator-card-topic">
                      {solver?.title ?? 'Calculator'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
