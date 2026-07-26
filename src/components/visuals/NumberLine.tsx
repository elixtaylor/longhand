import type { NumberLineData } from '../../lib/engine/visuals';

/**
 * The solution set of an inequality on a number line — open circles for strict
 * inequalities, filled for inclusive, with the satisfying regions shaded.
 */
export function NumberLine({ data }: { data: NumberLineData }) {
  const { points, regions } = data;
  const xs = points.map((p) => p.x);
  if (xs.length === 0 || !xs.every(Number.isFinite)) return null;

  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const pad = Math.max((hi - lo) * 0.6, 2);
  const min = lo - pad;
  const max = hi + pad;

  const W = 340;
  const H = 74;
  const PAD = 24;
  const y = 38;
  const sx = (v: number) => PAD + ((v - min) / (max - min)) * (W - PAD * 2);

  return (
    <div className="viz-scroll">
      <svg
        className="diagram"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label="Number line showing the solution set"
      >
        {regions.map((r, i) => {
          const from = r.from === null ? PAD / 2 : sx(r.from);
          const to = r.to === null ? W - PAD / 2 : sx(r.to);
          return (
            <line
              key={i}
              x1={from}
              y1={y}
              x2={to}
              y2={y}
              className="diagram-region"
              strokeLinecap="round"
            />
          );
        })}

        <line x1={PAD / 2} y1={y} x2={W - PAD / 2} y2={y} className="diagram-axis" />
        {/* arrowheads */}
        <polyline points={`${PAD / 2 + 7},${y - 4} ${PAD / 2},${y} ${PAD / 2 + 7},${y + 4}`} className="diagram-axis" fill="none" />
        <polyline
          points={`${W - PAD / 2 - 7},${y - 4} ${W - PAD / 2},${y} ${W - PAD / 2 - 7},${y + 4}`}
          className="diagram-axis"
          fill="none"
        />

        {points.map((p) => (
          <g key={p.x}>
            <circle
              cx={sx(p.x)}
              cy={y}
              r={5.5}
              className={p.filled ? 'diagram-point-key' : 'diagram-point-open'}
            />
            <text x={sx(p.x)} y={y + 22} className="diagram-label" textAnchor="middle">
              {String(Math.round(p.x * 100) / 100)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
