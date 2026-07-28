import { useState } from 'react';

type CxOp = '+' | '-' | '*' | '/' | 'modulus' | 'conjugate' | 'polar';

const OPS: Array<{ id: CxOp; label: string; needsB: boolean }> = [
  { id: '+', label: 'Add', needsB: true },
  { id: '-', label: 'Subtract', needsB: true },
  { id: '*', label: 'Multiply', needsB: true },
  { id: '/', label: 'Divide', needsB: true },
  { id: 'modulus', label: 'Modulus', needsB: false },
  { id: 'conjugate', label: 'Conjugate', needsB: false },
  { id: 'polar', label: 'Polar form', needsB: false },
];

/** "3+4i", "-3-4i" — always the whole signed number, never just "4i". */
function cxStr(re: number, im: number): string {
  return `${re}${im < 0 ? '-' : '+'}${Math.abs(im)}i`;
}

/** Builds the same text complex.ts's free-text parser already reads. */
function serialize(op: CxOp, a: { re: number; im: number }, b: { re: number; im: number } | null): string {
  const za = `(${cxStr(a.re, a.im)})`;
  switch (op) {
    case '+':
    case '-':
    case '*':
    case '/':
      return `${za}${op}(${cxStr(b!.re, b!.im)})`;
    case 'modulus':
      return `|${cxStr(a.re, a.im)}|`;
    case 'conjugate':
      return `conj(${cxStr(a.re, a.im)})`;
    case 'polar':
      return `polar(${cxStr(a.re, a.im)})`;
  }
}

/**
 * Complex numbers' rectangular/polar methods cover several operations under
 * one free-text grammar (add/subtract/multiply/divide/modulus/conjugate/
 * polar form) rather than one fixed set of values — same shape as Vectors'
 * component form (see VectorOperationForm) — so this picks the operation
 * first, then shows only the complex number(s) that operation needs. A
 * complex number is always exactly a re/im pair, unlike a vector, so there's
 * no dimension toggle here.
 */
export function ComplexOperationForm({
  onSubmit,
  onOperationChange,
}: {
  onSubmit: (serialized: string) => void;
  /** The solver's two methods (rectangular/polar) both render this same
   * form, but the tab highlighted (and its blurb) should still track which
   * family the pick belongs to, rather than staying wherever it was when
   * this form was opened. */
  onOperationChange?: (methodId: 'rectangular' | 'polar') => void;
}) {
  const [op, setOp] = useState<CxOp>('+');
  const [a, setA] = useState(['', '']);
  const [b, setB] = useState(['', '']);

  const current = OPS.find((o) => o.id === op)!;

  function parsePair(values: string[]): { re: number; im: number } | null {
    const nums = values.map((s) => Number(s.trim()));
    if (values.some((s) => s.trim() === '') || nums.some((n) => !Number.isFinite(n))) return null;
    return { re: nums[0], im: nums[1] };
  }

  const aVal = parsePair(a);
  const bVal = parsePair(b);
  const complete = !!aVal && (!current.needsB || !!bVal);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    onSubmit(serialize(op, aVal!, current.needsB ? bVal! : null));
  }

  function setComponent(which: 'a' | 'b', index: number, raw: string) {
    const setter = which === 'a' ? setA : setB;
    setter((prev) => {
      const next = [...prev];
      next[index] = raw;
      return next;
    });
  }

  function complexField(label: string, values: string[], which: 'a' | 'b') {
    return (
      <div className="structured-field" key={which}>
        <label className="field-label">{label}</label>
        <div className="ratio-inputs">
          <input
            className="expr-input num-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="re"
            aria-label={`${label} — real part`}
            value={values[0]}
            onChange={(e) => setComponent(which, 0, e.target.value)}
          />
          <span className="ratio-colon" aria-hidden="true">
            +
          </span>
          <input
            className="expr-input num-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="im"
            aria-label={`${label} — imaginary part`}
            value={values[1]}
            onChange={(e) => setComponent(which, 1, e.target.value)}
          />
          <span className="ratio-colon" aria-hidden="true">
            i
          </span>
        </div>
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
              onOperationChange?.(o.id === 'polar' ? 'polar' : 'rectangular');
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {complexField(current.needsB ? 'z₁' : 'z', a, 'a')}
      {current.needsB && complexField('z₂', b, 'b')}

      <button type="submit" className="btn-primary" disabled={!complete}>
        Show the working
      </button>
    </form>
  );
}
