/**
 * Static reference illustrations for structured-input methods — generic
 * (not drawn from the values entered), just showing what each labelled
 * field means. See StructuredInputForm.
 */
export function MethodDiagram({ methodId }: { methodId: string }) {
  if (methodId === 'collinear') return <CollinearDiagram />;
  if (methodId === 'ratio') return <RatioDiagram />;
  if (methodId === 'pythagoras' || methodId === 'trig-ratio') return <RightTriangleDiagram />;
  if (methodId === 'sine-rule' || methodId === 'cosine-rule' || methodId === 'area') {
    return <GeneralTriangleDiagram />;
  }
  return null;
}

/** Labels match the solver's own a, b, c, A, B, C — no right angle assumed. */
function GeneralTriangleDiagram() {
  return (
    <svg
      className="diagram"
      viewBox="0 0 190 115"
      width={190}
      height={115}
      role="img"
      aria-label="A triangle with sides a, b and c opposite angles A, B and C respectively"
    >
      <polygon points="20,95 165,95 75,15" className="diagram-shape" />
      <text x={92} y={111} textAnchor="middle" className="diagram-label">a</text>
      <text x={30} y={53} textAnchor="middle" className="diagram-label">b</text>
      <text x={140} y={53} textAnchor="middle" className="diagram-label">c</text>
      <text x={75} y={9} textAnchor="middle" className="diagram-label diagram-label-vertex">A</text>
      <text x={178} y={101} textAnchor="middle" className="diagram-label diagram-label-vertex">B</text>
      <text x={7} y={101} textAnchor="middle" className="diagram-label diagram-label-vertex">C</text>
    </svg>
  );
}

/** Labels match the solver's own a, b, c, A, B — the right angle sits at C. */
function RightTriangleDiagram() {
  return (
    <svg
      className="diagram"
      viewBox="0 0 190 110"
      width={190}
      height={110}
      role="img"
      aria-label="A right-angled triangle with legs a and b, hypotenuse c, and angles A and B"
    >
      <polygon points="20,85 165,85 20,15" className="diagram-shape" />
      <polyline points="32,85 32,73 20,73" className="diagram-rightangle" />
      <text x={92} y={101} textAnchor="middle" className="diagram-label">a</text>
      <text x={7} y={53} textAnchor="middle" className="diagram-label">b</text>
      <text x={104} y={44} textAnchor="middle" className="diagram-label">c</text>
      <text x={11} y={10} textAnchor="middle" className="diagram-label diagram-label-vertex">A</text>
      <text x={178} y={90} textAnchor="middle" className="diagram-label diagram-label-vertex">B</text>
    </svg>
  );
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
