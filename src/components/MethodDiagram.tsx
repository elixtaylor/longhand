/**
 * Static reference illustrations for structured-input methods — generic
 * (not drawn from the values entered), just showing what each labelled
 * field means. See StructuredInputForm.
 */
export function MethodDiagram({ methodId }: { methodId: string }) {
  if (methodId === 'collinear') return <CollinearDiagram />;
  if (methodId === 'ratio') return <RatioDiagram />;
  if (methodId === 'pythagoras' || methodId === 'trig-ratio')
    return <RightTriangleDiagram />;
  if (
    methodId === 'sine-rule' ||
    methodId === 'cosine-rule' ||
    methodId === 'area'
  ) {
    return <GeneralTriangleDiagram />;
  }
  if (methodId === 'measurements') return <CircleMeasurementsDiagram />;
  if (methodId === 'arc-sector') return <CircleArcSectorDiagram />;
  if (methodId === 'chord') return <CircleChordDiagram />;
  if (methodId === 'centre-angle') return <CircleCentreAngleDiagram />;
  if (methodId === 'cyclic') return <CyclicQuadrilateralDiagram />;
  if (methodId === 'same-segment') return <CircleSameSegmentDiagram />;
  if (methodId === 'semicircle') return <CircleSemicircleDiagram />;
  if (methodId === 'tangent-radius') return <TangentRadiusDiagram />;
  if (methodId === 'equal-tangents') return <EqualTangentsDiagram />;
  if (methodId === 'equal-chords') return <CircleEqualChordsDiagram />;
  if (methodId === 'tangent-chord') return <TangentChordDiagram />;
  if (methodId === 'chord-distance') return <ChordDistanceDiagram />;
  if (methodId === 'tangent-length') return <TangentLengthDiagram />;
  if (methodId === 'intersecting-chords') return <IntersectingChordsDiagram />;
  if (methodId === 'power-of-point') return <PowerOfPointDiagram />;
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
      <text x={92} y={111} textAnchor="middle" className="diagram-label">
        a
      </text>
      <text x={30} y={53} textAnchor="middle" className="diagram-label">
        b
      </text>
      <text x={140} y={53} textAnchor="middle" className="diagram-label">
        c
      </text>
      <text
        x={75}
        y={9}
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        A
      </text>
      <text
        x={178}
        y={101}
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        B
      </text>
      <text
        x={7}
        y={101}
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        C
      </text>
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
      <text x={92} y={101} textAnchor="middle" className="diagram-label">
        a
      </text>
      <text x={7} y={53} textAnchor="middle" className="diagram-label">
        b
      </text>
      <text x={104} y={44} textAnchor="middle" className="diagram-label">
        c
      </text>
      <text
        x={11}
        y={10}
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        A
      </text>
      <text
        x={178}
        y={90}
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        B
      </text>
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
          <text
            x={p.x}
            y={p.y - 10}
            textAnchor="middle"
            className="diagram-label diagram-label-vertex"
          >
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
      <text
        x={A.x}
        y={A.y + 20}
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        A
      </text>
      <text
        x={P.x}
        y={P.y + 20}
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        P
      </text>
      <text
        x={B.x}
        y={B.y + 20}
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        B
      </text>
      <text
        x={(A.x + P.x) / 2}
        y={A.y - 12}
        textAnchor="middle"
        className="diagram-label"
      >
        m
      </text>
      <text
        x={(P.x + B.x) / 2}
        y={A.y - 12}
        textAnchor="middle"
        className="diagram-label"
      >
        n
      </text>
    </svg>
  );
}

const CIRCLE_VIEWBOX = '0 0 220 150';

function CircleMeasurementsDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A circle showing its radius r and diameter d"
    >
      <circle cx="110" cy="75" r="50" className="diagram-shape" />
      <line x1="60" y1="75" x2="160" y2="75" className="diagram-axis" />
      <line x1="110" y1="75" x2="160" y2="75" className="diagram-curve" />
      <circle cx="110" cy="75" r="3.5" className="diagram-point-key" />
      <text
        x="110"
        y="69"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        O
      </text>
      <text x="136" y="68" textAnchor="middle" className="diagram-label">
        r
      </text>
      <text x="110" y="91" textAnchor="middle" className="diagram-label">
        d
      </text>
    </svg>
  );
}

function CircleArcSectorDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A circle sector showing radius r, central angle theta and arc length"
    >
      <path
        d="M110 75 L110 25 A50 50 0 0 1 160 75 Z"
        className="diagram-shape"
      />
      <path d="M110 25 A50 50 0 0 1 160 75" className="diagram-curve" />
      <line x1="110" y1="75" x2="110" y2="25" className="diagram-curve" />
      <line x1="110" y1="75" x2="160" y2="75" className="diagram-curve" />
      <path d="M110 43 A32 32 0 0 1 142 75" className="diagram-axis-dashed" />
      <text x="121" y="61" className="diagram-label diagram-label-key">
        θ
      </text>
      <text x="111" y="45" className="diagram-label">
        r
      </text>
      <text
        x="143"
        y="33"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        arc
      </text>
      <circle cx="110" cy="75" r="3.5" className="diagram-point-key" />
      <text
        x="102"
        y="90"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        O
      </text>
    </svg>
  );
}

function CircleChordDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A circle with a chord, two radii and a shaded circular segment"
    >
      <circle cx="110" cy="75" r="50" className="diagram-shape" />
      <path d="M70 50 A50 50 0 0 1 150 50 L70 50 Z" className="diagram-shade" />
      <line x1="70" y1="50" x2="150" y2="50" className="diagram-curve" />
      <line x1="110" y1="75" x2="70" y2="50" className="diagram-axis-dashed" />
      <line x1="110" y1="75" x2="150" y2="50" className="diagram-axis-dashed" />
      <circle cx="110" cy="75" r="3.5" className="diagram-point-key" />
      <text
        x="110"
        y="91"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        O
      </text>
      <text
        x="110"
        y="44"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        chord c
      </text>
      <text x="89" y="62" textAnchor="middle" className="diagram-label">
        r
      </text>
      <text x="137" y="41" textAnchor="middle" className="diagram-label">
        segment
      </text>
    </svg>
  );
}

function CircleCentreAngleDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A circle comparing an angle at the centre with an angle at the circumference"
    >
      <circle cx="110" cy="75" r="50" className="diagram-shape" />
      <line x1="110" y1="75" x2="70" y2="50" className="diagram-curve" />
      <line x1="110" y1="75" x2="150" y2="50" className="diagram-curve" />
      <line x1="70" y1="50" x2="110" y2="125" className="diagram-axis-dashed" />
      <line
        x1="150"
        y1="50"
        x2="110"
        y2="125"
        className="diagram-axis-dashed"
      />
      <path d="M99 68 A15 15 0 0 1 121 68" className="diagram-rightangle" />
      <path d="M103 101 A18 18 0 0 1 117 101" className="diagram-rightangle" />
      <circle cx="110" cy="75" r="3.5" className="diagram-point-key" />
      <circle cx="110" cy="125" r="3.5" className="diagram-point-key" />
      <text
        x="110"
        y="91"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        θ
      </text>
      <text
        x="110"
        y="114"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        φ
      </text>
      <text
        x="101"
        y="87"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        O
      </text>
      <text
        x="110"
        y="143"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        circumference
      </text>
      <text x="110" y="19" textAnchor="middle" className="diagram-label">
        θ = 2φ
      </text>
    </svg>
  );
}

function CyclicQuadrilateralDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A cyclic quadrilateral inside a circle with opposite angles marked"
    >
      <circle cx="110" cy="75" r="50" className="diagram-shape" />
      <polygon
        points="110,26 157,64 135,119 77,119 63,64"
        className="diagram-shade"
      />
      <polyline
        points="110,26 157,64 135,119 77,119 63,64 110,26"
        className="diagram-curve"
      />
      <text
        x="110"
        y="20"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        A
      </text>
      <text
        x="168"
        y="64"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        B
      </text>
      <text
        x="138"
        y="134"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        C
      </text>
      <text
        x="69"
        y="134"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        D
      </text>
      <text
        x="110"
        y="147"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        A + C = 180°
      </text>
    </svg>
  );
}

function CircleSameSegmentDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A circle with two equal angles in the same segment standing on one chord"
    >
      <circle cx="110" cy="75" r="50" className="diagram-shape" />
      <line x1="70" y1="75" x2="150" y2="75" className="diagram-curve" />
      <line x1="70" y1="75" x2="110" y2="27" className="diagram-axis-dashed" />
      <line x1="150" y1="75" x2="110" y2="27" className="diagram-axis-dashed" />
      <line x1="70" y1="75" x2="110" y2="123" className="diagram-axis-dashed" />
      <line
        x1="150"
        y1="75"
        x2="110"
        y2="123"
        className="diagram-axis-dashed"
      />
      <text
        x="110"
        y="23"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        α
      </text>
      <text
        x="110"
        y="142"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        β
      </text>
      <text x="110" y="69" textAnchor="middle" className="diagram-label">
        same chord
      </text>
    </svg>
  );
}

function CircleSemicircleDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A triangle in a circle with a diameter and a right angle in the semicircle"
    >
      <circle cx="110" cy="75" r="50" className="diagram-shape" />
      <line x1="60" y1="75" x2="160" y2="75" className="diagram-curve" />
      <line x1="60" y1="75" x2="110" y2="33" className="diagram-axis-dashed" />
      <line x1="160" y1="75" x2="110" y2="33" className="diagram-axis-dashed" />
      <polyline points="103,39 109,45 115,39" className="diagram-rightangle" />
      <text
        x="110"
        y="25"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        90°
      </text>
      <text x="110" y="91" textAnchor="middle" className="diagram-label">
        diameter
      </text>
    </svg>
  );
}

function CircleEqualChordsDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A circle with two equal chords and equal central angles"
    >
      <circle cx="110" cy="75" r="50" className="diagram-shape" />
      <line x1="70" y1="50" x2="150" y2="50" className="diagram-curve" />
      <line x1="70" y1="100" x2="150" y2="100" className="diagram-curve" />
      <line x1="110" y1="75" x2="70" y2="50" className="diagram-axis-dashed" />
      <line x1="110" y1="75" x2="150" y2="50" className="diagram-axis-dashed" />
      <line x1="110" y1="75" x2="70" y2="100" className="diagram-axis-dashed" />
      <line
        x1="110"
        y1="75"
        x2="150"
        y2="100"
        className="diagram-axis-dashed"
      />
      <text
        x="110"
        y="45"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        c₁ = c₂
      </text>
      <text x="110" y="119" textAnchor="middle" className="diagram-label">
        θ₁ = θ₂
      </text>
    </svg>
  );
}

function TangentRadiusDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A radius meeting a tangent at a right angle"
    >
      <circle cx="95" cy="82" r="42" className="diagram-shape" />
      <line x1="95" y1="82" x2="137" y2="82" className="diagram-axis-dashed" />
      <line x1="137" y1="25" x2="137" y2="133" className="diagram-curve" />
      <polyline points="127,82 127,72 137,72" className="diagram-rightangle" />
      <circle cx="95" cy="82" r="3.5" className="diagram-point-key" />
      <circle cx="137" cy="82" r="3.5" className="diagram-point-key" />
      <text x="91" y="99" className="diagram-label diagram-label-vertex">
        O
      </text>
      <text x="142" y="80" className="diagram-label diagram-label-vertex">
        T
      </text>
      <text x="116" y="76" textAnchor="middle" className="diagram-label">
        r
      </text>
      <text x="177" y="55" textAnchor="middle" className="diagram-label">
        tangent
      </text>
      <text
        x="137"
        y="68"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        90°
      </text>
    </svg>
  );
}

function EqualTangentsDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="Two equal tangents from one external point to a circle"
    >
      <circle cx="92" cy="82" r="42" className="diagram-shape" />
      <line x1="180" y1="28" x2="125" y2="52" className="diagram-curve" />
      <line x1="180" y1="28" x2="125" y2="112" className="diagram-curve" />
      <line x1="92" y1="82" x2="125" y2="52" className="diagram-axis-dashed" />
      <line x1="92" y1="82" x2="125" y2="112" className="diagram-axis-dashed" />
      <circle cx="180" cy="28" r="3.5" className="diagram-point-key" />
      <text x="187" y="25" className="diagram-label diagram-label-vertex">
        P
      </text>
      <text x="151" y="36" textAnchor="middle" className="diagram-label">
        t₁
      </text>
      <text x="151" y="101" textAnchor="middle" className="diagram-label">
        t₂
      </text>
      <text
        x="152"
        y="137"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        t₁ = t₂
      </text>
    </svg>
  );
}

function IntersectingChordsDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="Two chords intersecting inside a circle with four segment lengths"
    >
      <circle cx="110" cy="75" r="50" className="diagram-shape" />
      <line x1="67" y1="43" x2="153" y2="107" className="diagram-curve" />
      <line x1="67" y1="107" x2="153" y2="43" className="diagram-curve" />
      <circle cx="110" cy="75" r="3.5" className="diagram-point-key" />
      <text x="85" y="57" textAnchor="middle" className="diagram-label">
        a
      </text>
      <text x="136" y="92" textAnchor="middle" className="diagram-label">
        b
      </text>
      <text x="85" y="93" textAnchor="middle" className="diagram-label">
        c
      </text>
      <text x="136" y="57" textAnchor="middle" className="diagram-label">
        d
      </text>
      <text
        x="110"
        y="142"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        ab = cd
      </text>
    </svg>
  );
}

function PowerOfPointDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A tangent and secant from an external point with tangent and secant segments"
    >
      <circle cx="88" cy="82" r="42" className="diagram-shape" />
      <line x1="180" y1="27" x2="126" y2="51" className="diagram-curve" />
      <line x1="180" y1="27" x2="50" y2="115" className="diagram-curve" />
      <circle cx="180" cy="27" r="3.5" className="diagram-point-key" />
      <text x="188" y="24" className="diagram-label diagram-label-vertex">
        P
      </text>
      <text x="151" y="35" textAnchor="middle" className="diagram-label">
        t
      </text>
      <text x="153" y="53" textAnchor="middle" className="diagram-label">
        e
      </text>
      <text x="106" y="88" textAnchor="middle" className="diagram-label">
        w
      </text>
      <text
        x="151"
        y="137"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        t² = ew
      </text>
    </svg>
  );
}

function TangentChordDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A tangent and chord at a point on a circle, matched to an alternate segment angle"
    >
      <circle cx="105" cy="78" r="45" className="diagram-shape" />
      <line x1="150" y1="20" x2="150" y2="136" className="diagram-curve" />
      <line x1="150" y1="78" x2="83" y2="43" className="diagram-curve" />
      <line x1="83" y1="43" x2="82" y2="122" className="diagram-axis-dashed" />
      <line x1="82" y1="122" x2="150" y2="78" className="diagram-axis-dashed" />
      <circle cx="150" cy="78" r="3.5" className="diagram-point-key" />
      <text x="157" y="81" className="diagram-label diagram-label-vertex">
        T
      </text>
      <text x="118" y="48" textAnchor="middle" className="diagram-label">
        chord
      </text>
      <text x="181" y="50" textAnchor="middle" className="diagram-label">
        tangent
      </text>
      <text
        x="99"
        y="115"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        alternate angle
      </text>
      <text
        x="151"
        y="69"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        θ
      </text>
    </svg>
  );
}

function ChordDistanceDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="A chord with a perpendicular distance from the centre and a right triangle"
    >
      <circle cx="110" cy="75" r="50" className="diagram-shape" />
      <line x1="67" y1="45" x2="153" y2="45" className="diagram-curve" />
      <line x1="110" y1="75" x2="110" y2="45" className="diagram-axis-dashed" />
      <line x1="110" y1="75" x2="153" y2="45" className="diagram-axis-dashed" />
      <polyline points="110,45 118,45 118,53" className="diagram-rightangle" />
      <circle cx="110" cy="75" r="3.5" className="diagram-point-key" />
      <text
        x="101"
        y="91"
        textAnchor="middle"
        className="diagram-label diagram-label-vertex"
      >
        O
      </text>
      <text
        x="104"
        y="62"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        d
      </text>
      <text x="132" y="61" textAnchor="middle" className="diagram-label">
        r
      </text>
      <text
        x="110"
        y="39"
        textAnchor="middle"
        className="diagram-label diagram-label-key"
      >
        c / 2
      </text>
    </svg>
  );
}

function TangentLengthDiagram() {
  return (
    <svg
      className="diagram circle-diagram"
      viewBox={CIRCLE_VIEWBOX}
      width={220}
      height={150}
      role="img"
      aria-label="An external point joined to a circle centre and tangent point, forming a right triangle"
    >
      <circle cx="75" cy="88" r="45" className="diagram-shape" />
      <line x1="75" y1="88" x2="105" y2="49" className="diagram-axis-dashed" />
      <line x1="75" y1="88" x2="185" y2="26" className="diagram-axis-dashed" />
      <line x1="185" y1="26" x2="105" y2="49" className="diagram-curve" />
      <polyline points="105,49 111,57 117,51" className="diagram-rightangle" />
      <circle cx="75" cy="88" r="3.5" className="diagram-point-key" />
      <circle cx="105" cy="49" r="3.5" className="diagram-point-key" />
      <circle cx="185" cy="26" r="3.5" className="diagram-point-key" />
      <text x="65" y="105" className="diagram-label diagram-label-vertex">
        O
      </text>
      <text x="101" y="40" className="diagram-label diagram-label-vertex">
        T
      </text>
      <text x="192" y="23" className="diagram-label diagram-label-vertex">
        P
      </text>
      <text x="145" y="35" textAnchor="middle" className="diagram-label">
        PT
      </text>
      <text x="127" y="73" textAnchor="middle" className="diagram-label">
        OP
      </text>
      <text x="84" y="61" textAnchor="middle" className="diagram-label">
        r
      </text>
    </svg>
  );
}
