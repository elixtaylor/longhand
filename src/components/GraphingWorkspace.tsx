import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateExpr, parseExpr, type Expr } from '../lib/math/expr';
import { fmt } from '../lib/math/num';

interface GraphExpression {
  id: number;
  text: string;
  colour: string;
}

interface CompiledGraphExpression extends GraphExpression {
  parsed: Expr | null;
  error: string;
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

interface AxisSteps {
  x?: number;
  y?: number;
}

const COLOURS = ['#2f6fed', '#d05242', '#2f8b68', '#9a63c7', '#d18a2a'];

function parseGraphExpression(expression: string): Expr {
  const source = expression.replace(/^\s*y\s*=\s*/i, '').trim();
  if (!source) throw new Error('Enter an expression after y =.');
  return parseExpr(source);
}

/** Evaluate the same expression grammar used by the numerical fallback. */
export function evaluateGraphExpression(expression: string, x: number): number {
  return evaluateExpr(parseGraphExpression(expression), { x });
}

function compileGraphExpression(
  expression: GraphExpression,
): CompiledGraphExpression {
  try {
    return {
      ...expression,
      parsed: parseGraphExpression(expression.text),
      error: '',
    };
  } catch (caught) {
    return {
      ...expression,
      parsed: null,
      error:
        caught instanceof Error ? caught.message : 'Check this expression.',
    };
  }
}

function parseX(value: string): number | null {
  const x = Number(value.trim());
  return Number.isFinite(x) ? x : null;
}

function tableFor(expression: Expr | null, xValues: string[]): TablePoint[] {
  if (!expression) return [];
  return xValues.flatMap((source) => {
    const x = parseX(source);
    if (x === null) return [];
    try {
      const y = evaluateExpr(expression, { x });
      return Number.isFinite(y) ? [{ x, y, source }] : [];
    } catch {
      return [];
    }
  });
}

function samplePath(
  expression: CompiledGraphExpression,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
): string {
  if (!expression.parsed) return '';
  const samples = 420;
  const commands: string[] = [];
  let previous: number | null = null;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + ((xMax - xMin) * i) / samples;
    let y: number;
    try {
      y = evaluateExpr(expression.parsed, { x });
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

function niceStep(range: number, targetTicks: number): number {
  const rough = Math.max(range / targetTicks, Number.EPSILON);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const factor =
    normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return factor * magnitude;
}

function ticksFor(min: number, max: number, step: number): number[] {
  if (!Number.isFinite(step) || step <= 0) return [];
  const first = Math.ceil((min - Number.EPSILON) / step) * step;
  const count = Math.min(80, Math.floor((max - first) / step) + 1);
  return Array.from(
    { length: Math.max(count, 0) },
    (_, index) => first + index * step,
  );
}

function GraphPlot({
  expressions,
  points,
  bounds,
  axisSteps,
  zoomLevel,
}: {
  expressions: CompiledGraphExpression[];
  points: TablePoint[];
  bounds: GraphBounds;
  axisSteps: AxisSteps;
  zoomLevel: number;
}) {
  const [activePoint, setActivePoint] = useState<string | null>(null);
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
  const baseXMin = bounds.xMin ?? autoXMin;
  const baseXMax = bounds.xMax ?? autoXMax;
  const sampled = useMemo(() => {
    const values: number[] = [];
    for (const expression of expressions) {
      if (!expression.parsed) continue;
      for (let i = 0; i <= 120; i++) {
        const x = baseXMin + ((baseXMax - baseXMin) * i) / 120;
        try {
          const y = evaluateExpr(expression.parsed, { x });
          if (Number.isFinite(y) && Math.abs(y) < 1e6) values.push(y);
        } catch {
          // The expression row displays its own parsing error.
        }
      }
    }
    return values;
  }, [baseXMax, baseXMin, expressions]);
  const autoYMin = Math.min(
    -5,
    ...(sampled.length ? [Math.min(...sampled)] : []),
  );
  const autoYMax = Math.max(
    5,
    ...(sampled.length ? [Math.max(...sampled)] : []),
  );
  const yPadding = Math.max((autoYMax - autoYMin) * 0.12, 1);
  const baseYMin = bounds.yMin ?? autoYMin - yPadding;
  const baseYMax = bounds.yMax ?? autoYMax + yPadding;
  const safeZoom = Math.max(0.25, Math.min(16, zoomLevel));
  const xCentre = (baseXMin + baseXMax) / 2;
  const yCentre = (baseYMin + baseYMax) / 2;
  const xHalfSpan = (baseXMax - baseXMin) / (2 * safeZoom);
  const yHalfSpan = (baseYMax - baseYMin) / (2 * safeZoom);
  const xMin = xCentre - xHalfSpan;
  const xMax = xCentre + xHalfSpan;
  const yMin = yCentre - yHalfSpan;
  const yMax = yCentre + yHalfSpan;
  const width = 860;
  const height = 470;
  const pad = { left: 50, right: 18, top: 18, bottom: 38 };
  const sx = (x: number) =>
    pad.left + ((x - xMin) / (xMax - xMin)) * (width - pad.left - pad.right);
  const sy = (y: number) =>
    height -
    pad.bottom -
    ((y - yMin) / (yMax - yMin)) * (height - pad.top - pad.bottom);
  const xStep = axisSteps.x ?? niceStep(xMax - xMin, 8);
  const yStep = axisSteps.y ?? niceStep(yMax - yMin, 6);
  const xTicks = ticksFor(xMin, xMax, xStep);
  const yTicks = ticksFor(yMin, yMax, yStep);
  const paths = useMemo(() => {
    const scaleX = (x: number) =>
      pad.left + ((x - xMin) / (xMax - xMin)) * (width - pad.left - pad.right);
    const scaleY = (y: number) =>
      height -
      pad.bottom -
      ((y - yMin) / (yMax - yMin)) * (height - pad.top - pad.bottom);
    return expressions.map((expression) => ({
      id: expression.id,
      colour: expression.colour,
      path: samplePath(expression, xMin, xMax, yMin, yMax, scaleX, scaleY),
    }));
  }, [
    expressions,
    height,
    pad.bottom,
    pad.left,
    pad.right,
    pad.top,
    width,
    xMax,
    xMin,
    yMax,
    yMin,
  ]);

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
      {paths.map((path) => (
        <path
          key={path.id}
          d={path.path}
          className="graph-expression-line"
          style={{ stroke: path.colour }}
        />
      ))}
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
          const pointId = `${point.x}-${index}`;
          const isActive = activePoint === pointId;
          const pointX = sx(point.x);
          const pointY = sy(point.y);
          const boxWidth = label.length * 6.4 + 8;
          const gap = 16;
          const boxX = Math.min(
            Math.max(pointX - boxWidth / 2, pad.left + 4),
            width - pad.right - boxWidth - 4,
          );
          const labelX = boxX + boxWidth / 2;
          const boxHeight = 18;
          const aboveY = pointY - gap - boxHeight;
          const belowY = pointY + gap;
          const boxY =
            aboveY >= pad.top
              ? aboveY
              : belowY + boxHeight <= height - pad.bottom
                ? belowY
                : Math.max(pad.top, aboveY);
          const labelY = boxY + boxHeight / 2;
          return (
            <g
              key={pointId}
              className={`graph-point-group${isActive ? ' is-active' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={`Point ${label}`}
              onMouseEnter={() => setActivePoint(pointId)}
              onMouseLeave={() => setActivePoint(null)}
              onFocus={() => setActivePoint(pointId)}
              onBlur={() => setActivePoint(null)}
            >
              <circle
                cx={pointX}
                cy={pointY}
                r="12"
                className="graph-point-hover-target"
              />
              <circle
                cx={pointX}
                cy={pointY}
                r={isActive ? 6 : 5}
                className="graph-table-point"
              />
              <rect
                x={boxX}
                y={boxY}
                width={boxWidth}
                height={boxHeight}
                rx="3"
                className={`graph-point-label-bg${isActive ? ' is-visible' : ''}`}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`graph-point-label${isActive ? ' is-visible' : ''}`}
              >
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
  const [axisSteps, setAxisSteps] = useState<AxisSteps>({});
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [draftBounds, setDraftBounds] = useState({
    xMin: '',
    xMax: '',
    yMin: '',
    yMax: '',
  });
  const [draftSteps, setDraftSteps] = useState({ x: '', y: '' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusTableRow, setFocusTableRow] = useState<number | null>(null);
  const tableInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const compiledExpressions = useMemo(
    () => expressions.map(compileGraphExpression),
    [expressions],
  );
  const table = useMemo(
    () => tableFor(compiledExpressions[0]?.parsed ?? null, xValues),
    [compiledExpressions, xValues],
  );

  useEffect(() => {
    if (focusTableRow === null) return;
    tableInputRefs.current[focusTableRow]?.focus();
    setFocusTableRow(null);
  }, [focusTableRow, xValues.length]);

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

  function removeTableRow(index: number) {
    const next = xValues.filter((_, rowIndex) => rowIndex !== index);
    setXValues(next);
    if (next.length > 0) {
      setFocusTableRow(Math.min(index, next.length - 1));
    }
  }

  function openSettings() {
    setDraftBounds({
      xMin: bounds.xMin === undefined ? '' : String(bounds.xMin),
      xMax: bounds.xMax === undefined ? '' : String(bounds.xMax),
      yMin: bounds.yMin === undefined ? '' : String(bounds.yMin),
      yMax: bounds.yMax === undefined ? '' : String(bounds.yMax),
    });
    setDraftSteps({
      x: axisSteps.x === undefined ? '' : String(axisSteps.x),
      y: axisSteps.y === undefined ? '' : String(axisSteps.y),
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
    const steps = {
      x: draftSteps.x.trim() === '' ? undefined : Number(draftSteps.x),
      y: draftSteps.y.trim() === '' ? undefined : Number(draftSteps.y),
    };
    if (
      Object.values(steps).some(
        (value) =>
          value !== undefined && (!Number.isFinite(value) || value <= 0),
      )
    )
      return;
    setBounds(values);
    setAxisSteps(steps);
    setZoomLevel(1);
    setSettingsOpen(false);
  }

  function handleGraphWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!zoomEnabled) return;
    event.preventDefault();
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    setZoomLevel((current) =>
      Math.max(0.25, Math.min(16, current * Math.exp(-delta * 0.002))),
    );
  }

  return (
    <div className="graphing-overlay">
      <header className="graphing-header">
        <div className="graphing-header-left">
          <button
            type="button"
            className="return-btn"
            aria-label="Return to equation input"
            onClick={onClose}
          >
            ← Return
          </button>
          <h1 className="graphing-kicker">Graphs and Equations</h1>
        </div>
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
              const error = compiledExpressions[index]?.error ?? '';
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
                      ref={(element) => {
                        tableInputRefs.current[index] = element;
                      }}
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
                      onClick={() => removeTableRow(index)}
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
                <label>
                  x increment
                  <input
                    inputMode="decimal"
                    aria-label="x axis increment"
                    value={draftSteps.x}
                    onChange={(event) =>
                      setDraftSteps((current) => ({
                        ...current,
                        x: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  y increment
                  <input
                    inputMode="decimal"
                    aria-label="y axis increment"
                    value={draftSteps.y}
                    onChange={(event) =>
                      setDraftSteps((current) => ({
                        ...current,
                        y: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="graph-zoom-setting">
                <input
                  type="checkbox"
                  checked={zoomEnabled}
                  aria-label="Enable trackpad zoom"
                  onChange={(event) => setZoomEnabled(event.target.checked)}
                />
                <span>Trackpad zoom</span>
              </label>
              <div className="graph-settings-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setBounds({});
                    setAxisSteps({});
                    setZoomLevel(1);
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
          <div className="graphing-plot-wrap" onWheel={handleGraphWheel}>
            <GraphPlot
              expressions={compiledExpressions}
              points={table}
              bounds={bounds}
              axisSteps={axisSteps}
              zoomLevel={zoomLevel}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
