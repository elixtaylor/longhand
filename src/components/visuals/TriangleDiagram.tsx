import type { TriangleData } from '../../lib/engine/visuals';

/**
 * A triangle drawn to scale from its three side lengths, with sides and
 * angles labelled. Vertex A sits opposite side a, as in the working.
 */
export function TriangleDiagram({ data }: { data: TriangleData }) {
  const { a, b, c, A, B, C, rightAngle } = data;
  if (![a, b, c].every((s) => Number.isFinite(s) && s > 0)) return null;
  // Degenerate triangles can't be drawn.
  if (a + b <= c || a + c <= b || b + c <= a) return null;

  // Place C at the origin and B along the x-axis; side a = CB, b = CA, c = AB.
  const Cp = { x: 0, y: 0 };
  const Bp = { x: a, y: 0 };
  const cosC = (a * a + b * b - c * c) / (2 * a * b);
  const angC = Math.acos(Math.max(-1, Math.min(1, cosC)));
  const Ap = { x: b * Math.cos(angC), y: b * Math.sin(angC) };

  const pts = [Ap, Bp, Cp];
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const maxY = Math.max(...pts.map((p) => p.y));
  const pad = Math.max(maxX - minX, maxY) * 0.22 + 14;
  const w = maxX - minX + pad * 2;
  const h = maxY + pad * 2;

  // SVG y grows downward, so flip.
  const X = (p: { x: number; y: number }) => p.x - minX + pad;
  const Y = (p: { x: number; y: number }) => h - pad - p.y;

  const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({
    x: (X(p) + X(q)) / 2,
    y: (Y(p) + Y(q)) / 2,
  });
  const centroid = { x: (X(Ap) + X(Bp) + X(Cp)) / 3, y: (Y(Ap) + Y(Bp) + Y(Cp)) / 3 };

  /** Nudge a label outward from the centre so it clears the edge. */
  function out(p: { x: number; y: number }, by = 15) {
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * by, y: p.y + (dy / len) * by };
  }

  const sideLabels = [
    { pos: out(mid(Bp, Cp)), text: `a = ${round(a)}` },
    { pos: out(mid(Ap, Cp)), text: `b = ${round(b)}` },
    { pos: out(mid(Ap, Bp)), text: `c = ${round(c)}` },
  ];
  const vertexLabels = [
    { pos: out({ x: X(Ap), y: Y(Ap) }, 13), text: A !== undefined ? `A = ${round(A)}°` : 'A' },
    { pos: out({ x: X(Bp), y: Y(Bp) }, 13), text: B !== undefined ? `B = ${round(B)}°` : 'B' },
    { pos: out({ x: X(Cp), y: Y(Cp) }, 13), text: C !== undefined ? `C = ${round(C)}°` : 'C' },
  ];

  const scale = 260 / Math.max(w, h);

  return (
    <div className="viz-scroll">
      <svg
        className="diagram"
        viewBox={`0 0 ${w} ${h}`}
        width={w * scale}
        height={h * scale}
        role="img"
        aria-label={`Triangle with sides ${round(a)}, ${round(b)} and ${round(c)}`}
      >
        <polygon
          points={pts.map((p) => `${X(p)},${Y(p)}`).join(' ')}
          className="diagram-shape"
        />
        {rightAngle && <RightAngleMark at={Cp} toward={[Bp, Ap]} X={X} Y={Y} />}
        {sideLabels.map((l) => (
          <text key={l.text} x={l.pos.x} y={l.pos.y} className="diagram-label" textAnchor="middle">
            {l.text}
          </text>
        ))}
        {vertexLabels.map((l) => (
          <text
            key={l.text}
            x={l.pos.x}
            y={l.pos.y}
            className="diagram-label diagram-label-vertex"
            textAnchor="middle"
          >
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

function RightAngleMark({
  at,
  toward,
  X,
  Y,
}: {
  at: { x: number; y: number };
  toward: Array<{ x: number; y: number }>;
  X: (p: { x: number; y: number }) => number;
  Y: (p: { x: number; y: number }) => number;
}) {
  const o = { x: X(at), y: Y(at) };
  const size = 12;
  const dirs = toward.map((t) => {
    const dx = X(t) - o.x;
    const dy = Y(t) - o.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: (dx / len) * size, y: (dy / len) * size };
  });
  const p1 = { x: o.x + dirs[0].x, y: o.y + dirs[0].y };
  const p2 = { x: o.x + dirs[0].x + dirs[1].x, y: o.y + dirs[0].y + dirs[1].y };
  const p3 = { x: o.x + dirs[1].x, y: o.y + dirs[1].y };
  return (
    <polyline
      points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
      className="diagram-rightangle"
    />
  );
}

function round(x: number): string {
  return String(Math.round(x * 100) / 100);
}
