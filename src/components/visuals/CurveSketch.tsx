import type { CurveData } from '../../lib/engine/visuals';

/**
 * A polynomial curve with its intercepts and turning points marked — the
 * sketch a student is asked to draw, rendered from the same numbers the
 * working produced.
 */
export function CurveSketch({ data }: { data: CurveData }) {
  const { coeffs, roots, yIntercept, turningPoints } = data;
  const f = (x: number) => coeffs.reduce((sum, [p, c]) => sum + c * Math.pow(x, p), 0);

  // Frame the interesting part of the curve: every marked feature, padded.
  const xsOfInterest = [...roots, ...turningPoints.map((t) => t.x), 0];
  const xMinRaw = Math.min(...xsOfInterest);
  const xMaxRaw = Math.max(...xsOfInterest);
  const spanRaw = Math.max(xMaxRaw - xMinRaw, 2);
  const xMin = xMinRaw - spanRaw * 0.35;
  const xMax = xMaxRaw + spanRaw * 0.35;

  const SAMPLES = 240;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = xMin + ((xMax - xMin) * i) / SAMPLES;
    pts.push({ x, y: f(x) });
  }

  const ysOfInterest = [...turningPoints.map((t) => t.y), yIntercept, 0];
  let yMin = Math.min(...ysOfInterest, ...pts.map((p) => p.y));
  let yMax = Math.max(...ysOfInterest, ...pts.map((p) => p.y));
  // Keep the vertical scale sane when the curve shoots off the top.
  const yInterest = Math.max(...ysOfInterest.map(Math.abs), 1);
  yMin = Math.max(yMin, -yInterest * 3.5);
  yMax = Math.min(yMax, yInterest * 3.5);
  const ySpan = Math.max(yMax - yMin, 1);
  yMin -= ySpan * 0.12;
  yMax += ySpan * 0.12;

  const W = 340;
  const H = 240;
  const PAD = 26;
  const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - PAD * 2);
  const sy = (y: number) => H - PAD - ((y - yMin) / (yMax - yMin)) * (H - PAD * 2);

  // Clip the path where it leaves the visible band.
  const path = pts
    .map((p, i) => {
      const inside = p.y >= yMin && p.y <= yMax;
      if (!inside) return null;
      const prevInside = i > 0 && pts[i - 1].y >= yMin && pts[i - 1].y <= yMax;
      return `${prevInside ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');

  const showXAxis = yMin <= 0 && yMax >= 0;
  const showYAxis = xMin <= 0 && xMax >= 0;

  return (
    <div className="viz-scroll">
      <svg className="diagram" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Sketch of the curve with intercepts and turning points marked">
        {showXAxis && <line x1={PAD / 2} y1={sy(0)} x2={W - PAD / 2} y2={sy(0)} className="diagram-axis" />}
        {showYAxis && <line x1={sx(0)} y1={PAD / 2} x2={sx(0)} y2={H - PAD / 2} className="diagram-axis" />}

        <path d={path} className="diagram-curve" />

        {roots.map((r) => (
          <g key={`r${r}`}>
            <circle cx={sx(r)} cy={sy(0)} r={4} className="diagram-point" />
            <text x={sx(r)} y={sy(0) + 16} className="diagram-label" textAnchor="middle">
              {trim(r)}
            </text>
          </g>
        ))}

        {showYAxis && (
          <g>
            <circle cx={sx(0)} cy={sy(yIntercept)} r={4} className="diagram-point" />
            <text x={sx(0) - 8} y={sy(yIntercept) - 7} className="diagram-label" textAnchor="end">
              {trim(yIntercept)}
            </text>
          </g>
        )}

        {turningPoints.map((t) => (
          <g key={`t${t.x}`}>
            <circle cx={sx(t.x)} cy={sy(t.y)} r={4.5} className="diagram-point-key" />
            <text
              x={sx(t.x)}
              y={sy(t.y) + (t.kind === 'max' ? -10 : 18)}
              className="diagram-label diagram-label-key"
              textAnchor="middle"
            >
              ({trim(t.x)}, {trim(t.y)})
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function trim(x: number): string {
  const r = Math.round(x * 100) / 100;
  return String(r);
}
