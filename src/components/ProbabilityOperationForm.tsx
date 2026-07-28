import { useState } from 'react';

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
 * Probability's methods are a genuine operation choice (see VectorOperationForm/
 * ComplexOperationForm), but two of them also take one further, optional value —
 * P(A∩B), left blank to assume independent events — which those two didn't need,
 * so this isn't quite either existing op-form's shape.
 */
export function ProbabilityOperationForm({
  onSubmit,
  onOperationChange,
}: {
  onSubmit: (serialized: string) => void;
  /** Probability's methods are exactly these four operations (unlike
   * Vectors'/Complex's, which sit several operations under one or two
   * methods) — so the method the rest of the page thinks is active has to
   * track the pick here, or the tab highlighted (and its blurb) drifts out
   * of sync with what was actually just solved. */
  onOperationChange?: (id: ProbOp) => void;
}) {
  const [op, setOp] = useState<ProbOp>('single');
  const [fav, setFav] = useState('');
  const [total, setTotal] = useState('');
  const [pa, setPa] = useState('');
  const [pb, setPb] = useState('');
  const [pab, setPab] = useState('');

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
        (pab.trim() === '' || Number.isFinite(pabN));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    if (op === 'single') {
      onSubmit(`${favN} out of ${totalN}`);
      return;
    }
    const parts = [`P(A)=${paN}`, `P(B)=${pbN}`];
    if (op !== 'intersection' && pab.trim() !== '') parts.push(`P(A and B)=${pabN}`);
    onSubmit(`${parts.join(', ')} ${OPS.find((o) => o.id === op)!.keyword}`);
  }

  function numberField(label: string, value: string, setValue: (v: string) => void, placeholder?: string) {
    return (
      <div className="number-field" key={label}>
        <label className="field-label">{label}</label>
        <input
          className="expr-input num-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          aria-label={label}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    );
  }

  return (
    <form className="structured-form" onSubmit={submit}>
      <div className="op-picker" role="radiogroup" aria-label="Operation">
        {OPS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={op === o.id}
            onClick={() => {
              setOp(o.id);
              onOperationChange?.(o.id);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {op === 'single' ? (
        <div className="number-fields">
          {numberField('Favourable outcomes', fav, setFav)}
          {numberField('Total outcomes', total, setTotal)}
        </div>
      ) : (
        <>
          <div className="number-fields">
            {numberField('P(A)', pa, setPa, '0–1')}
            {numberField('P(B)', pb, setPb, '0–1')}
            {op !== 'intersection' && numberField('P(A∩B)', pab, setPab)}
          </div>
          {op !== 'intersection' && (
            <p className="setting-hint">Leave P(A∩B) blank to assume independent events.</p>
          )}
        </>
      )}

      <button type="submit" className="btn-primary" disabled={!complete}>
        Show the working
      </button>
    </form>
  );
}
