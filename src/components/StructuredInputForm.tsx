import { useEffect, useState } from 'react';
import type { FieldSchema, Method } from '../lib/engine/types';
import { MethodDiagram } from './MethodDiagram';

type Dims = 2 | 3;

function blank(field: FieldSchema): string[] {
  return field.kind === 'number' ? [''] : ['', '', ''];
}

/**
 * A form built from a Method's `fields`, for methods better filled in than
 * typed (a handful of named values rather than one free-text expression).
 * Submitting serializes the values into the same canonical string `solve`
 * already parses for this method — see `Method.serialize`.
 *
 * Every field is required unless marked `optional` — for a solver built
 * around "fill in what you know" (e.g. a right triangle solved from any two
 * of a, b, c, A, B) rather than one fixed set of required values, where
 * submitting needs only enough of them filled, not all.
 */
export function StructuredInputForm({
  method,
  onSubmit,
}: {
  method: Method;
  onSubmit: (serialized: string) => void;
}) {
  const fields = method.fields ?? [];
  const hasPoint = fields.some((f) => f.kind === 'point');
  const hasOptional = fields.some((f) => f.optional);
  // Specialist's own vector work is mostly 3D — 2D is the one click away.
  const [dims, setDims] = useState<Dims>(3);
  const [values, setValues] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(fields.map((f) => [f.id, blank(f)])),
  );

  // A method's own fields never change shape, but switching to a *different*
  // method can — e.g. Vectors' Collinearity vs Ratio of division. Reset only
  // when the set of field ids actually changes, not on every switch: a right
  // triangle's Pythagoras and SOH CAH TOA tabs share the same five fields, and
  // switching between them should not throw away what was just typed.
  const fieldKey = fields.map((f) => f.id).join('|');
  useEffect(() => {
    setValues(Object.fromEntries(fields.map((f) => [f.id, blank(f)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey]);

  function widthFor(field: FieldSchema): number {
    return field.kind === 'ratio' ? 2 : field.kind === 'number' ? 1 : dims;
  }

  function setComponent(fieldId: string, index: number, raw: string) {
    setValues((prev) => {
      const next = [...prev[fieldId]];
      next[index] = raw;
      return { ...prev, [fieldId]: next };
    });
  }

  const parsed: Record<string, number[]> = {};
  let complete = fields.length > 0;
  for (const f of fields) {
    const comps = values[f.id].slice(0, widthFor(f));
    if (f.kind === 'number' && f.optional) {
      // Blank is a value not given, not a reason to disable submitting.
      const raw = (comps[0] ?? '').trim();
      if (raw === '') {
        parsed[f.id] = [];
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n)) complete = false;
      parsed[f.id] = [n];
      continue;
    }
    const nums = comps.map((s) => Number(s.trim()));
    if (comps.some((s) => s.trim() === '') || nums.some((n) => !Number.isFinite(n))) complete = false;
    parsed[f.id] = nums;
  }
  // "Fill in what you know" needs enough of the optional fields, not all.
  if (hasOptional && !fields.some((f) => f.optional && parsed[f.id].length > 0)) {
    complete = false;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete || !method.serialize) return;
    onSubmit(method.serialize(parsed));
  }

  const fixedFields = fields.filter((f) => f.kind !== 'number');
  const numberFields = fields.filter((f) => f.kind === 'number');

  return (
    <form className="structured-form" onSubmit={submit}>
      <MethodDiagram methodId={method.id} />

      {hasPoint && (
        <div className="dims-toggle" role="radiogroup" aria-label="Number of dimensions">
          <button type="button" aria-pressed={dims === 2} onClick={() => setDims(2)}>
            2D
          </button>
          <button type="button" aria-pressed={dims === 3} onClick={() => setDims(3)}>
            3D
          </button>
        </div>
      )}

      {hasOptional && <p className="setting-hint">Fill in whatever you know — the rest gets worked out.</p>}

      {fixedFields.map((f) => (
        <div className="structured-field" key={f.id}>
          <label className="field-label">{f.label}</label>
          {f.kind === 'point' ? (
            <div className="point-inputs">
              {values[f.id].slice(0, dims).map((v, i) => (
                <input
                  key={i}
                  className="expr-input num-input"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={['x', 'y', 'z'][i]}
                  aria-label={`${f.label} — ${['x', 'y', 'z'][i]}`}
                  value={v}
                  onChange={(e) => setComponent(f.id, i, e.target.value)}
                />
              ))}
            </div>
          ) : (
            <div className="ratio-inputs">
              <input
                className="expr-input num-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="m"
                aria-label={`${f.label} — m`}
                value={values[f.id][0]}
                onChange={(e) => setComponent(f.id, 0, e.target.value)}
              />
              <span className="ratio-colon" aria-hidden="true">:</span>
              <input
                className="expr-input num-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="n"
                aria-label={`${f.label} — n`}
                value={values[f.id][1]}
                onChange={(e) => setComponent(f.id, 1, e.target.value)}
              />
            </div>
          )}
        </div>
      ))}

      {numberFields.length > 0 && (
        <div className="number-fields">
          {numberFields.map((f) => (
            <div className="number-field" key={f.id}>
              <label className="field-label">{f.label}</label>
              <input
                className="expr-input num-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label={f.label}
                value={values[f.id][0]}
                onChange={(e) => setComponent(f.id, 0, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={!complete}>
        Show the working
      </button>
    </form>
  );
}
