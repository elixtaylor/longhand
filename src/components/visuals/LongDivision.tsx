import type { LongDivisionData } from '../../lib/engine/visuals';

export function LongDivision({ data }: { data: LongDivisionData }) {
  const { divisor, dividendDigits, quotientDigits, carries, remainder } = data;
  const firstSignificant = quotientDigits.findIndex((d) => d !== '0');

  return (
    <div className="viz-scroll">
      <div className="bus-stop" role="img" aria-label={`${dividendDigits.join('')} divided by ${divisor} equals ${data.quotient}${remainder ? ' remainder ' + remainder : ''}`}>
        <div className="bus-divisor">{divisor}</div>
        <div className="bus-body">
          <div className="bus-quotient">
            {quotientDigits.map((d, i) => (
              <span key={i} className="bus-cell">
                {firstSignificant !== -1 && i >= firstSignificant ? d : ''}
              </span>
            ))}
            {remainder > 0 && <span className="bus-remainder">r {remainder}</span>}
          </div>
          <div className="bus-dividend">
            {dividendDigits.map((d, i) => (
              <span key={i} className="bus-cell">
                {carries[i] != null && <sup className="bus-carry">{carries[i]}</sup>}
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
