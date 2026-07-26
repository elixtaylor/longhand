import type { NormalData } from '../../lib/engine/visuals';

/**
 * A normal distribution with the region of interest shaded — the picture that
 * makes a probability question make sense.
 */
export function NormalCurve({ data }: { data: NormalData }) {
  const { mean, sd, lo, hi, label } = data;
  if (!Number.isFinite(mean) || !Number.isFinite(sd) || sd <= 0) return null;

  const W = 340;
  const H = 180;
  const PAD = 26;
  const xMin = mean - 3.6 * sd;
  const xMax = mean + 3.6 * sd;
  const phi = (x: number) => Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));

  const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - PAD * 2);
  const sy = (d: number) => H - PAD - d * (H - PAD * 2);

  const SAMPLES = 200;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = xMin + ((xMax - xMin) * i) / SAMPLES;
    pts.push([x, phi(x)]);
  }
  const curve = pts.map(([x, d], i) => `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(d).toFixed(1)}`).join(' ');

  const shadeLo = lo ?? xMin;
  const shadeHi = hi ?? xMax;
  const shadePts = pts.filter(([x]) => x >= shadeLo && x <= shadeHi);
  const shade =
    shadePts.length > 1
      ? `M${sx(shadePts[0][0]).toFixed(1)},${sy(0).toFixed(1)} ` +
        shadePts.map(([x, d]) => `L${sx(x).toFixed(1)},${sy(d).toFixed(1)}`).join(' ') +
        ` L${sx(shadePts[shadePts.length - 1][0]).toFixed(1)},${sy(0).toFixed(1)} Z`
      : '';

  // Standard-deviation gridlines, the way a textbook draws them.
  const ticks = [-3, -2, -1, 0, 1, 2, 3].map((k) => ({ k, x: mean + k * sd }));

  return (
    <div className="viz-scroll">
      <svg
        className="diagram"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`Normal curve with mean ${mean} and standard deviation ${sd}, shaded ${label ?? 'region'}`}
      >
        {shade && <path d={shade} className="diagram-shade" />}
        <path d={curve} className="diagram-curve" />
        <line x1={PAD / 2} y1={sy(0)} x2={W - PAD / 2} y2={sy(0)} className="diagram-axis" />
        <line x1={sx(mean)} y1={sy(0)} x2={sx(mean)} y2={sy(1)} className="diagram-axis-dashed" />

        {ticks.map(({ k, x }) => (
          <g key={k}>
            <line x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(0) + 4} className="diagram-axis" />
            <text x={sx(x)} y={sy(0) + 16} className="diagram-label" textAnchor="middle">
              {k === 0 ? 'μ' : `${k > 0 ? '+' : ''}${k}σ`}
            </text>
          </g>
        ))}

        {lo !== null && lo > xMin && (
          <line x1={sx(lo)} y1={sy(0)} x2={sx(lo)} y2={sy(phi(lo))} className="diagram-bound" />
        )}
        {hi !== null && hi < xMax && (
          <line x1={sx(hi)} y1={sy(0)} x2={sx(hi)} y2={sy(phi(hi))} className="diagram-bound" />
        )}
        {label && (
          <text x={W / 2} y={PAD - 10} className="diagram-label diagram-label-key" textAnchor="middle">
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}
