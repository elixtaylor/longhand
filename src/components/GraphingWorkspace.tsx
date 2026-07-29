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
}: {
  expressions: GraphExpression[];
  points: TablePoint[];
}) {
  const finitePoints = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  const xValues = finitePoints.map((point) => point.x);
  const xMin = Math.min(
    -5,
    ...(xValues.length ? [Math.min(...xValues) - 1] : []),
  );
  const xMax = Math.max(
    10,
    ...(xValues.length ? [Math.max(...xValues) + 1] : []),
  );
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
  const rawYMin = Math.min(
    -5,
    ...(sampled.length ? [Math.min(...sampled)] : []),
  );
  const rawYMax = Math.max(
    5,
    ...(sampled.length ? [Math.max(...sampled)] : []),
  );
  const padding = Math.max((rawYMax - rawYMin) * 0.12, 1);
  const yMin = rawYMin - padding;
  const yMax = rawYMax + padding;
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
      {points.map((point, index) => (
        <g key={`${point.x}-${index}`}>
          <circle
            cx={sx(point.x)}
            cy={sy(point.y)}
            r="5"
            className="graph-table-point"
          />
          <text
            x={sx(point.x) + 8}
            y={sy(point.y) - 8}
            className="graph-point-label"
          >
            ({fmt(point.x)}, {fmt(point.y)})
          </text>
        </g>
      ))}
    </svg>
  );
}

export function GraphingWorkspace({ onClose }: { onClose: () => void }) {
  const [expressions, setExpressions] = useState<GraphExpression[]>([
    { id: 1, text: '100e^(0.05x)', colour: COLOURS[0] },
  ]);
  const [xValues, setXValues] = useState(['0', '1', '2', '3', '4']);
  const [nextId, setNextId] = useState(2);
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
              <p>
                Use x as the input. Any parseable <code>y = f(x)</code>{' '}
                expression can be tabled and plotted.
              </p>
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
                <p>
                  Enter x-coordinates. The first expression fills y
                  automatically.
                </p>
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
            <div>
              <h2>Graph</h2>
              <p>Table points are labelled on the curve.</p>
            </div>
            <span className="graphing-status">
              {table.length} plotted points
            </span>
          </div>
          <div className="graphing-plot-wrap">
            <GraphPlot expressions={expressions} points={table} />
          </div>
          <p className="graphing-help">
            Angles use radians, matching the graphing convention. Try{' '}
            <code>500e^(-0.08x)</code>, <code>sin(x)</code> or{' '}
            <code>x^2 - 4</code>.
          </p>
        </section>
      </main>
    </div>
  );
}
