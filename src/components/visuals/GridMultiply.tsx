import type { GridMultiplyData } from '../../lib/engine/visuals';

export function GridMultiply({ data }: { data: GridMultiplyData }) {
  const { colParts, rowParts } = data;
  return (
    <div className="viz-scroll">
      <table className="grid-multiply">
        <thead>
          <tr>
            <th className="gm-corner" aria-label="times">
              ×
            </th>
            {colParts.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowParts.map((r) => (
            <tr key={r}>
              <th scope="row">{r}</th>
              {colParts.map((c) => (
                <td key={c}>{r * c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
