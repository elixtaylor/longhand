import { useState } from 'react';
import { probabilitySolver } from '../solvers/statistics/probability';
import { CalculatorPreview } from './CalculatorPreview';

type ProbOp = 'single' | 'union' | 'intersection' | 'conditional';

/** The trailing keyword each op needs so probability.ts's regex-driven
 * dispatch (see its `asked` variable) resolves the same way regardless of
 * which tab happens to be current — explicit, rather than relying on the
 * methodId fallback it also honours. */
const OPS: Array<{ id: ProbOp; label: string; keyword: string }> = [
  { id: 'single', label: 'Single event', keyword: '' },
  { id: 'union', label: 'Union (or)', keyword: 'union' },
  { id: 'intersection', label: 'Intersection (and)', keyword: 'intersection' },
  { id: 'conditional', label: 'Conditional', keyword: 'conditional' },
];

/**
 * Probability's methods are a genuine operation choice. Combined events need
 * either a supplied overlap or an explicit independence assumption so the
 * calculator never invents a relationship between the events.
 */
export function ProbabilityOperationForm({
  methodId,
  onSubmit,
  onOperationChange,
}: {
  methodId?: ProbOp;
  onSubmit: (serialized: string) => void;
  /** Probability's methods are exactly these four operations (unlike
   * Vectors'/Complex's, which sit several operations under one or two
   * methods) — so the method the rest of the page thinks is active has to
   * track the pick here, or the tab highlighted (and its blurb) drifts out
   * of sync with what was actually just solved. */
  onOperationChange?: (id: ProbOp) => void;
}) {
  const [selectedOp, setSelectedOp] = useState<ProbOp>(methodId ?? 'single');
  const op = methodId ?? selectedOp;
  const [fav, setFav] = useState('');
  const [total, setTotal] = useState('');
  const [pa, setPa] = useState('');
  const [pb, setPb] = useState('');
  const [pab, setPab] = useState('');
  const [independent, setIndependent] = useState(false);

  const favN = Number(fav.trim());
  const totalN = Number(total.trim());
  const paN = Number(pa.trim());
  const pbN = Number(pb.trim());
  const pabN = Number(pab.trim());

  const complete =
    op === 'single'
      ? fav.trim() !== '' &&
        total.trim() !== '' &&
        Number.isInteger(favN) &&
        Number.isInteger(totalN) &&
        favN >= 0 &&
        totalN >= 0
      : pa.trim() !== '' &&
        pb.trim() !== '' &&
        Number.isFinite(paN) &&
        Number.isFinite(pbN) &&
        (pab.trim() === '' || Number.isFinite(pabN)) &&
        (independent || (op !== 'intersection' && pab.trim() !== ''));

  const serialized = complete
    ? op === 'single'
      ? `${favN} out of ${totalN}`
      : `${[
          `P(A)=${paN}`,
          `P(B)=${pbN}`,
          ...(op !== 'intersection' && pab.trim() !== ''
            ? [`P(A and B)=${pabN}`]
            : []),
          ...(independent ? ['independent'] : []),
        ].join(', ')} ${OPS.find((o) => o.id === op)!.keyword}`
    : '';
  const liveResult = complete ? probabilitySolver.solve(serialized, op) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    if (op === 'single') {
      onSubmit(`${favN} out of ${totalN}`);
      return;
    }
    const parts = [`P(A)=${paN}`, `P(B)=${pbN}`];
    if (op !== 'intersection' && pab.trim() !== '')
      parts.push(`P(A and B)=${pabN}`);
    if (independent) parts.push('independent');
    onSubmit(`${parts.join(', ')} ${OPS.find((o) => o.id === op)!.keyword}`);
  }

  function numberField(
    label: string,
    value: string,
    setValue: (v: string) => void,
    placeholder?: string,
  ) {
    const id = `probability-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    const invalid = value.trim() !== '' && !Number.isFinite(Number(value));
    return (
      <div className="number-field" key={label}>
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          className="expr-input num-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid || undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    );
  }

  function clearValues() {
    setFav('');
    setTotal('');
    setPa('');
    setPb('');
    setPab('');
    setIndependent(false);
  }

  return (
    <form className="structured-form" onSubmit={submit}>
      <fieldset className="calculator-choice">
        <legend className="calculator-section-label">Calculation</legend>
        <div className="op-picker" role="radiogroup" aria-label="Operation">
          {OPS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={op === o.id}
              onClick={() => {
                setSelectedOp(o.id);
                onOperationChange?.(o.id);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="calculator-input-region">
        {op === 'single' ? (
          <div className="number-fields">
            {numberField('Favourable outcomes', fav, setFav)}
            {numberField('Total outcomes', total, setTotal)}
          </div>
        ) : (
          <>
            <div className="number-fields">
              {numberField('P(A)', pa, setPa, '0 to 1')}
              {numberField('P(B)', pb, setPb, '0 to 1')}
              {op !== 'intersection' &&
                numberField('P(A∩B)', pab, setPab, '0 to 1')}
            </div>
            <label className="probability-assumption">
              <input
                type="checkbox"
                checked={independent}
                onChange={(event) => setIndependent(event.target.checked)}
              />
              <span>Events are independent</span>
            </label>
          </>
        )}
      </div>

      <CalculatorPreview result={liveResult} />

      <div className="calculator-actions">
        <button type="submit" className="btn-primary" disabled={!complete}>
          Solve
        </button>
        <button type="button" className="btn-secondary" onClick={clearValues}>
          Clear
        </button>
      </div>
    </form>
  );
}
