import { useMemo, useState } from 'react';
import { evaluateExpr, parseExpr } from '../lib/math/expr';
import { fmt } from '../lib/math/num';

interface GraphExpression {
  id: number;
  text: string;
  colour: string;
}

interface TablePoint {
  x: number;
  y: number;
  source: string;
}

interface GraphBounds {
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
}

const COLOURS = ['#2f6fed', '#d05242', '#2f8b68', '#9a63c7', '#d18a2a'];

/** Evaluate the same expression grammar used by the numerical fallback. */
export function evaluateGraphExpression(expression: string, x: number): number {
  const source = expression.replace(/^\s*y\s*=\s*/i, '').trim();
  if (!source) throw new Error('Enter an expression after y =.');
  const parsed = parseExpr(source);
  return evaluateExpr(parsed, { x });
}

function parseX(value: string): number | null {
  const x = Number(value.trim());
  return Number.isFinite(x) ? x : null;
}

function tableFor(expression: string, xValues: string[]): TablePoint[] {
  return xValues.flatMap((source) => {
    const x = parseX(source);
    if (x === null) return [];
    const y = evaluateGraphExpression(expression, x);
    return Number.isFinite(y) ? [{ x, y, source }] : [];
  });
}

function samplePath(
  expression: GraphExpression,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
): string {
  const samples = 420;
  const commands: string[] = [];
  let previous: number | null = null;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + ((xMax - xMin) * i) / samples;
    let y: number;
    try {
      y = evaluateGraphExpression(expression.text, x);
    } catch {
      previous = null;
      continue;
    }
    const inFrame = Number.isFinite(y) && y >= yMin && y <= yMax;
    const jump =
      previous !== null && Math.abs(y - previous) > (yMax - yMin) * 2;
    if (!inFrame || jump) {
      previous = null;
      continue;
    }
    commands.push(
      `${previous === null ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`,
    );
    previous = y;
  }
  return commands.join(' ');
}

function GraphPlot({
  expressions,
  points,
  bounds,
}: {
  expressions: GraphExpression[];
  points: TablePoint[];
  bounds: GraphBounds;
}) {
  const finitePoints = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  const xValues = finitePoints.map((point) => point.x);
  const autoXMin = Math.min(
    -5,
    ...(xValues.length ? [Math.min(...xValues) - 1] : []),
  );
  const autoXMax = Math.max(
    10,
    ...(xValues.length ? [Math.max(...xValues) + 1] : []),
  );
  const xMin = bounds.xMin ?? autoXMin;
  const xMax = bounds.xMax ?? autoXMax;
  const sampled: number[] = [];
  for (const expression of expressions) {
    for (let i = 0; i <= 120; i++) {
      const x = xMin + ((xMax - xMin) * i) / 120;
      try {
        const y = evaluateGraphExpression(expression.text, x);
        if (Number.isFinite(y) && Math.abs(y) < 1e6) sampled.push(y);
      } catch {
        // The expression row displays its own parsing error.
      }
    }
  }
  const autoYMin = Math.min(
    -5,
    ...(sampled.length ? [Math.min(...sampled)] : []),
  );
  const autoYMax = Math.max(
    5,
    ...(sampled.length ? [Math.max(...sampled)] : []),
  );
  const yPadding = Math.max((autoYMax - autoYMin) * 0.12, 1);
  const yMin = bounds.yMin ?? autoYMin - yPadding;
  const yMax = bounds.yMax ?? autoYMax + yPadding;
  const width = 860;
  const height = 470;
  const pad = { left: 50, right: 18, top: 18, bottom: 38 };
  const sx = (x: number) =>
    pad.left + ((x - xMin) / (xMax - xMin)) * (width - pad.left - pad.right);
  const sy = (y: number) =>
    height -
    pad.bottom -
    ((y - yMin) / (yMax - yMin)) * (height - pad.top - pad.bottom);
  const xTicks = Array.from(
    { length: 9 },
    (_, i) => xMin + ((xMax - xMin) * i) / 8,
  );
  const yTicks = Array.from(
    { length: 7 },
    (_, i) => yMin + ((yMax - yMin) * i) / 6,
  );

  return (
    <svg
      className="graphing-plot"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Graph of the entered expressions and table points"
    >
      {xTicks.map((x) => (
        <line
          key={`x-grid-${x}`}
          x1={sx(x)}
          x2={sx(x)}
          y1={pad.top}
          y2={height - pad.bottom}
          className="graph-grid-line"
        />
      ))}
      {yTicks.map((y) => (
        <line
          key={`y-grid-${y}`}
          x1={pad.left}
          x2={width - pad.right}
          y1={sy(y)}
          y2={sy(y)}
          className="graph-grid-line"
        />
      ))}
      {xMin <= 0 && xMax >= 0 && (
        <line
          x1={sx(0)}
          x2={sx(0)}
          y1={pad.top}
          y2={height - pad.bottom}
          className="graph-axis"
        />
      )}
      {yMin <= 0 && yMax >= 0 && (
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={sy(0)}
          y2={sy(0)}
          className="graph-axis"
        />
      )}
      {xTicks.map((x) => (
        <text
          key={`x-label-${x}`}
          x={sx(x)}
          y={height - 13}
          textAnchor="middle"
          className="graph-tick"
        >
          {fmt(x, 2)}
        </text>
      ))}
      {yTicks.map((y) => (
        <text
          key={`y-label-${y}`}
          x={pad.left - 9}
          y={sy(y) + 4}
          textAnchor="end"
          className="graph-tick"
        >
          {fmt(y, 2)}
        </text>
      ))}
      {expressions.map((expression) => {
        const path = samplePath(expression, xMin, xMax, yMin, yMax, sx, sy);
        return (
          <path
            key={expression.id}
            d={path}
            className="graph-expression-line"
            style={{ stroke: expression.colour }}
          />
        );
      })}
      {points
        .filter(
          (point) =>
            point.x >= xMin &&
            point.x <= xMax &&
            point.y >= yMin &&
            point.y <= yMax,
        )
        .map((point, index) => {
          const label = `(${fmt(point.x)}, ${fmt(point.y)})`;
          const labelX = Math.min(
            Math.max(sx(point.x) + 8, pad.left + 4),
            width - pad.right - label.length * 6.4 - 8,
          );
          const labelY = Math.max(
            sy(point.y) - 12 - (index % 3) * 17,
            pad.top + 14,
          );
          return (
            <g key={`${point.x}-${index}`}>
              <circle
                cx={sx(point.x)}
                cy={sy(point.y)}
                r="5"
                className="graph-table-point"
              />
              <rect
                x={labelX - 4}
                y={labelY - 12}
                width={label.length * 6.4 + 8}
                height="16"
                rx="3"
                className="graph-point-label-bg"
              />
              <text x={labelX} y={labelY} className="graph-point-label">
                {label}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

export function GraphingWorkspace({ onClose }: { onClose: () => void }) {
  const [expressions, setExpressions] = useState<GraphExpression[]>([
    { id: 1, text: '100e^(0.05x)', colour: COLOURS[0] },
  ]);
  const [xValues, setXValues] = useState(['0', '1', '2', '3', '4']);
  const [nextId, setNextId] = useState(2);
  const [bounds, setBounds] = useState<GraphBounds>({});
  const [draftBounds, setDraftBounds] = useState({
    xMin: '',
    xMax: '',
    yMin: '',
    yMax: '',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const table = useMemo(() => {
    try {
      return tableFor(expressions[0]?.text ?? '', xValues);
    } catch {
      return [];
    }
  }, [expressions, xValues]);

  function updateExpression(id: number, text: string) {
    setExpressions((rows) =>
      rows.map((row) => (row.id === id ? { ...row, text } : row)),
    );
  }
  function addExpression() {
    setExpressions((rows) => [
      ...rows,
      { id: nextId, text: '', colour: COLOURS[nextId % COLOURS.length] },
    ]);
    setNextId((value) => value + 1);
  }

  function openSettings() {
    setDraftBounds({
      xMin: bounds.xMin === undefined ? '' : String(bounds.xMin),
      xMax: bounds.xMax === undefined ? '' : String(bounds.xMax),
      yMin: bounds.yMin === undefined ? '' : String(bounds.yMin),
      yMax: bounds.yMax === undefined ? '' : String(bounds.yMax),
    });
    setSettingsOpen(true);
  }

  function applySettings() {
    const values = Object.fromEntries(
      Object.entries(draftBounds).map(([key, value]) => [
        key,
        value.trim() === '' ? undefined : Number(value),
      ]),
    ) as GraphBounds;
    const allValid = Object.values(values).every(
      (value) => value === undefined || Number.isFinite(value),
    );
    const xValid =
      values.xMin === undefined ||
      values.xMax === undefined ||
      values.xMin < values.xMax;
    const yValid =
      values.yMin === undefined ||
      values.yMax === undefined ||
      values.yMin < values.yMax;
    if (!allValid || !xValid || !yValid) return;
    setBounds(values);
    setSettingsOpen(false);
  }

  return (
    <div className="graphing-overlay">
      <header className="graphing-header">
        <div>
          <span className="graphing-kicker">Longhand / Graphing</span>
          <h1>Explore functions</h1>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close graphing"
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <main className="graphing-layout">
        <aside className="graphing-inspector">
          <div className="graphing-section-head">
            <div>
              <h2>Expressions</h2>
            </div>
            <button type="button" className="btn" onClick={addExpression}>
              + Add
            </button>
          </div>
          <div className="graph-expression-list">
            {expressions.map((expression, index) => {
              let error = '';
              try {
                evaluateGraphExpression(expression.text || 'x', 0);
              } catch (caught) {
                error =
                  caught instanceof Error
                    ? caught.message
                    : 'Check this expression.';
              }
              return (
                <div className="graph-expression-row" key={expression.id}>
                  <span
                    className="graph-expression-index"
                    style={{ color: expression.colour }}
                  >
                    {index + 1}
                  </span>
                  <input
                    aria-label={`Expression ${index + 1}`}
                    value={expression.text}
                    onChange={(event) =>
                      updateExpression(expression.id, event.target.value)
                    }
                    placeholder="e.g. 100e^(0.05x)"
                  />
                  {expressions.length > 1 && (
                    <button
                      type="button"
                      className="graph-remove"
                      aria-label={`Remove expression ${index + 1}`}
                      onClick={() =>
                        setExpressions((rows) =>
                          rows.filter((row) => row.id !== expression.id),
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                  {error && expression.text.trim() && (
                    <span className="graph-expression-error">{error}</span>
                  )}
                </div>
              );
            })}
          </div>
          <section className="graph-table-section">
            <div className="graphing-section-head">
              <div>
                <h2>Table</h2>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => setXValues((values) => [...values, ''])}
              >
                + Row
              </button>
            </div>
            <div
              className="graph-table"
              role="table"
              aria-label="Function values table"
            >
              <div className="graph-table-heading">
                <span>x</span>
                <span>y</span>
                <span aria-hidden="true" />
              </div>
              {xValues.map((value, index) => {
                const point = table.find(
                  (candidate) =>
                    candidate.source === value && candidate.x === parseX(value),
                );
                return (
                  <div
                    className="graph-table-row"
                    role="row"
                    key={`${index}-${value}`}
                  >
                    <input
                      aria-label={`x value ${index + 1}`}
                      value={value}
                      onChange={(event) =>
                        setXValues((values) =>
                          values.map((candidate, i) =>
                            i === index ? event.target.value : candidate,
                          ),
                        )
                      }
                    />
                    <output aria-label={`y value ${index + 1}`}>
                      {point ? fmt(point.y, 5) : '—'}
                    </output>
                    <button
                      type="button"
                      className="graph-remove"
                      aria-label={`Remove table row ${index + 1}`}
                      onClick={() =>
                        setXValues((values) =>
                          values.filter((_, i) => i !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
        <section className="graphing-canvas">
          <div className="graphing-canvas-head">
            <h2>Graph</h2>
            <div className="graphing-canvas-actions">
              <span className="graphing-status">{table.length} points</span>
              <button type="button" className="btn" onClick={openSettings}>
                Settings
              </button>
            </div>
          </div>
          {settingsOpen && (
            <div
              className="graph-settings-popover"
              role="dialog"
              aria-label="Graph settings"
            >
              <div className="graph-settings-head">
                <strong>Viewing window</strong>
                <button
                  type="button"
                  className="graph-remove"
                  aria-label="Close graph settings"
                  onClick={() => setSettingsOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className="graph-settings-grid">
                {(['xMin', 'xMax', 'yMin', 'yMax'] as const).map((key) => (
                  <label key={key}>
                    {key.replace('Min', ' min').replace('Max', ' max')}
                    <input
                      inputMode="decimal"
                      value={draftBounds[key]}
                      onChange={(event) =>
                        setDraftBounds((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="graph-settings-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setBounds({});
                    setSettingsOpen(false);
                  }}
                >
                  Auto
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={applySettings}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
          <div className="graphing-plot-wrap">
            <GraphPlot
              expressions={expressions}
              points={table}
              bounds={bounds}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
