import { useState } from 'react';
import { MethodDiagram } from './MethodDiagram';

type Dims = 2 | 3;
type VecOp = 'add' | 'sub' | 'scale' | 'dot' | 'cross' | 'magnitude' | 'unit' | 'angle';

const OPS: Array<{ id: VecOp; label: string; needsB: boolean; needsK: boolean }> = [
  { id: 'add', label: 'Add', needsB: true, needsK: false },
  { id: 'sub', label: 'Subtract', needsB: true, needsK: false },
  { id: 'scale', label: 'Scale', needsB: false, needsK: true },
  { id: 'dot', label: 'Dot product', needsB: true, needsK: false },
  { id: 'cross', label: 'Cross product', needsB: true, needsK: false },
  { id: 'magnitude', label: 'Magnitude', needsB: false, needsK: false },
  { id: 'unit', label: 'Unit vector', needsB: false, needsK: false },
  { id: 'angle', label: 'Angle between', needsB: false, needsK: false },
];

/** Builds the same text vectors.ts's free-text parser already reads. */
function serialize(op: VecOp, a: number[], b: number[] | null, k: number | null): string {
  const va = `(${a.join(',')})`;
  const vb = b ? `(${b.join(',')})` : '';
  switch (op) {
    case 'add':
      return `${va} + ${vb}`;
    case 'sub':
      return `${va} - ${vb}`;
    case 'dot':
      return `${va} . ${vb}`;
    case 'cross':
      return `${va} × ${vb}`;
    case 'angle':
      return `angle ${va} ${vb}`;
    case 'magnitude':
      return `|${va}|`;
    case 'unit':
      return `unit ${va}`;
    case 'scale':
      return `${k} * ${va}`;
  }
}

/**
 * Vectors' component form covers several operations under one free-text
 * grammar (add/subtract/scale/dot/cross/magnitude/unit/angle) rather than
 * one fixed set of values, so — unlike StructuredInputForm's fixed fields —
 * this picks the operation first, then shows only the vector(s) (and scalar,
 * for Scale) that operation needs. Submitting builds the same text string
 * vectors.ts's free-text parser already reads, same as StructuredInputForm.
 */
export function VectorOperationForm({ onSubmit }: { onSubmit: (serialized: string) => void }) {
  const [op, setOp] = useState<VecOp>('add');
  const [dims, setDims] = useState<Dims>(3);
  const [a, setA] = useState(['', '', '']);
  const [b, setB] = useState(['', '', '']);
  const [k, setK] = useState('');

  const current = OPS.find((o) => o.id === op)!;

  function parsePoint(values: string[]): { nums: number[]; complete: boolean } {
    const comps = values.slice(0, dims);
    const nums = comps.map((s) => Number(s.trim()));
    const complete = comps.every((s) => s.trim() !== '') && nums.every(Number.isFinite);
    return { nums, complete };
  }

  const aResult = parsePoint(a);
  const bResult = parsePoint(b);
  const kNum = Number(k.trim());
  const kComplete = k.trim() !== '' && Number.isFinite(kNum);

  const complete = aResult.complete && (!current.needsB || bResult.complete) && (!current.needsK || kComplete);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    onSubmit(serialize(op, aResult.nums, current.needsB ? bResult.nums : null, current.needsK ? kNum : null));
  }

  function setComponent(which: 'a' | 'b', index: number, raw: string) {
    const setter = which === 'a' ? setA : setB;
    setter((prev) => {
      const next = [...prev];
      next[index] = raw;
      return next;
    });
  }

  function pointField(label: string, values: string[], which: 'a' | 'b') {
    return (
      <div className="structured-field">
        <label className="field-label">{label}</label>
        <div className="point-inputs">
          {values.slice(0, dims).map((v, i) => (
            <input
              key={i}
              className="expr-input num-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={['x', 'y', 'z'][i]}
              aria-label={`${label} — ${['x', 'y', 'z'][i]}`}
              value={v}
              onChange={(e) => setComponent(which, i, e.target.value)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form className="structured-form" onSubmit={submit}>
      <MethodDiagram methodId={op} />

      <div className="op-picker" role="radiogroup" aria-label="Operation">
        {OPS.map((o) => (
          <button key={o.id} type="button" aria-pressed={op === o.id} onClick={() => setOp(o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="dims-toggle" role="radiogroup" aria-label="Number of dimensions">
        <button type="button" aria-pressed={dims === 2} onClick={() => setDims(2)}>
          2D
        </button>
        <button type="button" aria-pressed={dims === 3} onClick={() => setDims(3)}>
          3D
        </button>
      </div>

      {pointField(current.needsB ? 'Vector a' : 'Vector', a, 'a')}

      {current.needsK && (
        <div className="structured-field">
          <label className="field-label">Scalar k</label>
          <input
            className="expr-input num-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label="Scalar k"
            value={k}
            onChange={(e) => setK(e.target.value)}
          />
        </div>
      )}

      {current.needsB && pointField('Vector b', b, 'b')}

      <button type="submit" className="btn-primary" disabled={!complete}>
        Show the working
      </button>
    </form>
  );
}
