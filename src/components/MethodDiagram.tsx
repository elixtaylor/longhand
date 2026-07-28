/**
 * Static reference illustrations for structured-input methods — generic
 * (not drawn from the values entered), just showing what each labelled
 * field means. See StructuredInputForm.
 */
export function MethodDiagram({ methodId }: { methodId: string }) {
  if (methodId === 'collinear') return <CollinearDiagram />;
  if (methodId === 'ratio') return <RatioDiagram />;
  return null;
}

function CollinearDiagram() {
  const pts = [
    { x: 20, y: 72, label: 'A' },
    { x: 95, y: 44, label: 'B' },
    { x: 172, y: 15, label: 'C' },
  ];
  return (
    <svg
      className="diagram"
      viewBox="0 0 190 90"
      width={190}
      height={90}
      role="img"
      aria-label="Three points, A, B and C, all lying on one straight line"
    >
      <line x1={5} y1={80} x2={187} y2={7} className="diagram-curve" />
      {pts.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={4} className="diagram-point-key" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" className="diagram-label diagram-label-vertex">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function RatioDiagram() {
  const A = { x: 15, y: 45 };
  const P = { x: 100, y: 45 };
  const B = { x: 175, y: 45 };
  return (
    <svg
      className="diagram"
      viewBox="0 0 190 70"
      width={190}
      height={70}
      role="img"
      aria-label="Point P dividing the segment AB, with the two parts marked m and n"
    >
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} className="diagram-curve" />
      <circle cx={A.x} cy={A.y} r={4} className="diagram-point" />
      <circle cx={P.x} cy={P.y} r={4} className="diagram-point-key" />
      <circle cx={B.x} cy={B.y} r={4} className="diagram-point" />
      <text x={A.x} y={A.y + 20} textAnchor="middle" className="diagram-label diagram-label-vertex">A</text>
      <text x={P.x} y={P.y + 20} textAnchor="middle" className="diagram-label diagram-label-vertex">P</text>
      <text x={B.x} y={B.y + 20} textAnchor="middle" className="diagram-label diagram-label-vertex">B</text>
      <text x={(A.x + P.x) / 2} y={A.y - 12} textAnchor="middle" className="diagram-label">m</text>
      <text x={(P.x + B.x) / 2} y={A.y - 12} textAnchor="middle" className="diagram-label">n</text>
    </svg>
  );
}
