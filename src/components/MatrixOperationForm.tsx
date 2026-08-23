import { useState } from 'react';
import { matricesSolver } from '../solvers/specialist/matrices';
import { CalculatorPreview } from './CalculatorPreview';

type MatrixMethod =
  'standard' | 'determinant' | 'inverse' | 'transpose' | 'system';
type MatrixOp = 'add' | 'subtract' | 'multiply' | 'scale';
type MatrixSize = 2 | 3;

const OPS: Array<{ id: MatrixOp; label: string; symbol: string }> = [
  { id: 'add', label: 'Add', symbol: '+' },
  { id: 'subtract', label: 'Subtract', symbol: '−' },
  { id: 'multiply', label: 'Multiply', symbol: '×' },
  { id: 'scale', label: 'Scale', symbol: '×' },
];

function emptyMatrix(): string[][] {
  return Array.from({ length: 3 }, () => ['', '', '']);
}

function readMatrix(
  values: string[][],
  rows: number,
  columns: number,
): number[][] | null {
  const matrix = values
    .slice(0, rows)
    .map((row) => row.slice(0, columns).map((value) => Number(value.trim())));
  const raw = values.slice(0, rows).flatMap((row) => row.slice(0, columns));
  if (
    raw.some((value) => value.trim() === '') ||
    matrix.flat().some((value) => !Number.isFinite(value))
  ) {
    return null;
  }
  return matrix;
}

function matrixText(matrix: number[][]): string {
  return `[${matrix.map((row) => `[${row.join(',')}]`).join(',')}]`;
}

function matrixLabel(methodId: MatrixMethod): string {
  switch (methodId) {
    case 'determinant':
      return 'Determinant matrix';
    case 'inverse':
      return 'Matrix to invert';
    case 'transpose':
      return 'Matrix to transpose';
    case 'system':
      return 'Augmented matrix';
    default:
      return 'Matrix A';
  }
}

function MatrixGrid({
  label,
  values,
  rows,
  columns,
  onChange,
  columnLabels,
}: {
  label: string;
  values: string[][];
  rows: number;
  columns: number;
  onChange: (row: number, column: number, value: string) => void;
  columnLabels?: string[];
}) {
  return (
    <div className="matrix-field">
      <div className="matrix-field-head">
        <span className="field-label">{label}</span>
        <span className="matrix-size-label" aria-hidden="true">
          {rows} × {columns}
        </span>
      </div>
      <div className="matrix-shell">
        {columnLabels && (
          <div
            className="matrix-column-labels"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
            aria-hidden="true"
          >
            {columnLabels.slice(0, columns).map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
        )}
        <div
          className="matrix-grid"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          role="group"
          aria-label={label}
        >
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: columns }, (_, column) => {
              const value = values[row][column];
              const invalid =
                value.trim() !== '' && !Number.isFinite(Number(value.trim()));
              return (
                <input
                  key={`${row}-${column}`}
                  className="matrix-entry"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={`${label}, row ${row + 1}, column ${column + 1}`}
                  aria-invalid={invalid || undefined}
                  value={value}
                  onChange={(event) =>
                    onChange(row, column, event.target.value)
                  }
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

/** A visual matrix editor for the five matrix calculators. */
export function MatrixOperationForm({
  methodId,
  onSubmit,
}: {
  methodId: MatrixMethod;
  onSubmit: (serialized: string) => void;
}) {
  const [op, setOp] = useState<MatrixOp>('add');
  const [rows, setRows] = useState<MatrixSize>(2);
  const [columns, setColumns] = useState<MatrixSize>(2);
  const [bColumns, setBColumns] = useState<MatrixSize>(2);
  const [a, setA] = useState<string[][]>(emptyMatrix);
  const [b, setB] = useState<string[][]>(emptyMatrix);
  const [scalar, setScalar] = useState('');

  const square = methodId === 'determinant' || methodId === 'inverse';
  const fixedInverse = methodId === 'inverse';
  const fixedSystem = methodId === 'system';
  const aRows = fixedSystem ? 2 : fixedInverse ? 2 : rows;
  const aColumns = fixedSystem ? 3 : fixedInverse ? 2 : square ? rows : columns;
  const needsB =
    methodId === 'standard' &&
    (op === 'add' || op === 'subtract' || op === 'multiply');
  const bRows = op === 'multiply' ? aColumns : aRows;
  const actualBColumns = op === 'multiply' ? bColumns : aColumns;
  const aValue = readMatrix(a, aRows, aColumns);
  const bValue = needsB ? readMatrix(b, bRows, actualBColumns) : null;
  const scalarValue = Number(scalar.trim());
  const validScalar =
    op !== 'scale' || (scalar.trim() !== '' && Number.isFinite(scalarValue));
  const complete = !!aValue && (!needsB || !!bValue) && validScalar;

  let serialized = '';
  if (complete && aValue) {
    const textA = matrixText(aValue);
    if (methodId === 'standard') {
      if (op === 'scale') serialized = `${scalarValue} * ${textA}`;
      else {
        const symbol = op === 'add' ? '+' : op === 'subtract' ? '-' : '*';
        serialized = `${textA} ${symbol} ${matrixText(bValue!)}`;
      }
    } else if (methodId === 'determinant') serialized = `det ${textA}`;
    else if (methodId === 'inverse') serialized = `inverse ${textA}`;
    else if (methodId === 'transpose') serialized = `transpose ${textA}`;
    else serialized = `system ${textA}`;
  }

  const liveResult = complete
    ? matricesSolver.solve(serialized, methodId)
    : null;

  function setEntry(
    target: 'a' | 'b',
    row: number,
    column: number,
    value: string,
  ) {
    const setter = target === 'a' ? setA : setB;
    setter((previous) =>
      previous.map((line, lineIndex) =>
        lineIndex === row
          ? line.map((entry, entryIndex) =>
              entryIndex === column ? value : entry,
            )
          : line,
      ),
    );
  }

  function clearValues() {
    setA(emptyMatrix());
    setB(emptyMatrix());
    setScalar('');
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (complete) onSubmit(serialized);
  }

  return (
    <form className="structured-form matrix-form" onSubmit={submit}>
      {methodId === 'standard' && (
        <fieldset className="calculator-choice">
          <legend className="calculator-section-label">Operation</legend>
          <div className="op-picker" role="radiogroup" aria-label="Operation">
            {OPS.map((operation) => (
              <button
                key={operation.id}
                type="button"
                aria-pressed={op === operation.id}
                onClick={() => setOp(operation.id)}
              >
                {operation.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {!fixedInverse && !fixedSystem && (
        <div className="calculator-setting-row matrix-size-controls">
          <span className="calculator-section-label">
            {square ? 'Order' : 'Size'}
          </span>
          <div className="matrix-size-pickers">
            {square ? (
              <label>
                <span className="sr-only">Matrix order</span>
                <select
                  aria-label="Matrix order"
                  value={rows}
                  onChange={(event) =>
                    setRows(Number(event.target.value) as MatrixSize)
                  }
                >
                  <option value={2}>2 × 2</option>
                  <option value={3}>3 × 3</option>
                </select>
              </label>
            ) : (
              <>
                <label>
                  <span className="sr-only">Matrix A rows</span>
                  <select
                    aria-label="Matrix A rows"
                    value={rows}
                    onChange={(event) =>
                      setRows(Number(event.target.value) as MatrixSize)
                    }
                  >
                    <option value={2}>2 rows</option>
                    <option value={3}>3 rows</option>
                  </select>
                </label>
                <span aria-hidden="true">×</span>
                <label>
                  <span className="sr-only">Matrix A columns</span>
                  <select
                    aria-label="Matrix A columns"
                    value={columns}
                    onChange={(event) =>
                      setColumns(Number(event.target.value) as MatrixSize)
                    }
                  >
                    <option value={2}>2 columns</option>
                    <option value={3}>3 columns</option>
                  </select>
                </label>
              </>
            )}
          </div>
        </div>
      )}

      {methodId === 'standard' && op === 'multiply' && (
        <div className="calculator-setting-row matrix-size-controls">
          <span className="calculator-section-label">Matrix B columns</span>
          <div className="matrix-size-pickers">
            <label>
              <span className="sr-only">Matrix B columns</span>
              <select
                aria-label="Matrix B columns"
                value={bColumns}
                onChange={(event) =>
                  setBColumns(Number(event.target.value) as MatrixSize)
                }
              >
                <option value={2}>2 columns</option>
                <option value={3}>3 columns</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="calculator-input-region matrix-input-region">
        {methodId === 'standard' && op === 'scale' && (
          <div className="number-field matrix-scalar-field">
            <label className="field-label" htmlFor="matrix-scalar">
              Scalar
            </label>
            <input
              id="matrix-scalar"
              className="expr-input num-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={
                (scalar.trim() !== '' && !Number.isFinite(scalarValue)) ||
                undefined
              }
              value={scalar}
              onChange={(event) => setScalar(event.target.value)}
            />
          </div>
        )}

        <div className={`matrix-pair${needsB ? '' : ' matrix-pair--single'}`}>
          <MatrixGrid
            label={matrixLabel(methodId)}
            values={a}
            rows={aRows}
            columns={aColumns}
            columnLabels={fixedSystem ? ['x', 'y', 'constant'] : undefined}
            onChange={(row, column, value) => setEntry('a', row, column, value)}
          />

          {needsB && (
            <>
              <span className="matrix-operator" aria-hidden="true">
                {OPS.find((operation) => operation.id === op)!.symbol}
              </span>
              <MatrixGrid
                label="Matrix B"
                values={b}
                rows={bRows}
                columns={actualBColumns}
                onChange={(row, column, value) =>
                  setEntry('b', row, column, value)
                }
              />
            </>
          )}
        </div>
      </div>

      <CalculatorPreview result={liveResult} />

      <div className="calculator-actions">
        <button type="submit" className="btn-primary" disabled={!complete}>
          Solve
        </button>
        <button type="button" className="btn-secondary" onClick={clearValues}>
          Clear
        </button>
      </div>
    </form>
  );
}
