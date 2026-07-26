import type { BoxPlotData } from '../../lib/engine/visuals';

/** Box-and-whisker plot of a five-number summary. */
export function BoxPlot({ data }: { data: BoxPlotData }) {
  const { min, q1, median, q3, max, outliers = [] } = data;
  const values = [min, q1, median, q3, max, ...outliers];
  if (!values.every(Number.isFinite)) return null;

  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const W = 340;
  const H = 132;
  const PAD = 30;
  const sx = (v: number) => PAD + ((v - lo) / span) * (W - PAD * 2);

  const boxTop = 32;
  const boxH = 40;
  const mid = boxTop + boxH / 2;

  const marks: Array<[number, string]> = [
    [min, 'Min'],
    [q1, 'Q1'],
    [median, 'Med'],
    [q3, 'Q3'],
    [max, 'Max'],
  ];

  return (
    <div className="viz-scroll">
      <svg
        className="diagram"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`Box plot: minimum ${min}, lower quartile ${q1}, median ${median}, upper quartile ${q3}, maximum ${max}`}
      >
        {/* whiskers */}
        <line x1={sx(min)} y1={mid} x2={sx(q1)} y2={mid} className="diagram-axis" />
        <line x1={sx(q3)} y1={mid} x2={sx(max)} y2={mid} className="diagram-axis" />
        <line x1={sx(min)} y1={boxTop + 8} x2={sx(min)} y2={boxTop + boxH - 8} className="diagram-axis" />
        <line x1={sx(max)} y1={boxTop + 8} x2={sx(max)} y2={boxTop + boxH - 8} className="diagram-axis" />

        {/* box */}
        <rect
          x={sx(q1)}
          y={boxTop}
          width={Math.max(sx(q3) - sx(q1), 1)}
          height={boxH}
          className="diagram-shape"
        />
        <line x1={sx(median)} y1={boxTop} x2={sx(median)} y2={boxTop + boxH} className="diagram-bound" />

        {outliers.map((o) => (
          <circle key={o} cx={sx(o)} cy={mid} r={3.5} className="diagram-point-key" />
        ))}

        {/* scale */}
        <line x1={PAD / 2} y1={H - 26} x2={W - PAD / 2} y2={H - 26} className="diagram-axis" />
        {marks.map(([v, name]) => (
          <g key={name}>
            <line x1={sx(v)} y1={H - 26} x2={sx(v)} y2={H - 22} className="diagram-axis" />
            <text x={sx(v)} y={H - 12} className="diagram-label" textAnchor="middle">
              {trim(v)}
            </text>
            <text x={sx(v)} y={boxTop - 8} className="diagram-label diagram-label-key" textAnchor="middle">
              {name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function trim(x: number): string {
  return String(Math.round(x * 100) / 100);
}
