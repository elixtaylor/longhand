import { useEffect, useMemo, useState } from 'react';
import type {
  FieldSchema,
  Method,
  SolveResult,
  Solver,
} from '../lib/engine/types';
import { MethodDiagram } from './MethodDiagram';
import { CalculatorPreview } from './CalculatorPreview';

type Dims = 2 | 3;

function displayDerived(value: number): string {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

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
 *
 * The caller must remount this (via a `key` derived from the field ids —
 * see Workspace) whenever the field *set* changes, e.g. switching Vectors'
 * Collinearity to Ratio of division. Resetting `values` in an effect instead
 * looks equivalent but isn't: the render in between the method-prop
 * changing and the effect running still has the old values keyed by the old
 * field ids, so `values[newFieldId]` is undefined for one render — enough to
 * crash. A method whose tabs share one field set (a right triangle's
 * Pythagoras and SOH CAH TOA) keeps the same key, so switching between them
 * never remounts and never loses what was typed.
 */
export function StructuredInputForm({
  method,
  solver,
  onSubmit,
}: {
  method: Method;
  solver?: Solver;
  onSubmit: (serialized: string) => void;
}) {
  const fields = useMemo(() => method.fields ?? [], [method]);
  const hasPoint = fields.some((f) => f.kind === 'point');
  // A method can mix required and optional fields (e.g. a confidence
  // interval needs the sample stats but defaults the confidence level when
  // left blank) — "give me at least one" only makes sense when *nothing*
  // else is required, otherwise the required fields already guarantee
  // there's something to solve.
  const allOptional =
    fields.length > 0 && fields.every((f) => f.kind === 'number' && f.optional);
  // Most vector questions in SACE start in the plane. Keep 3D one click away
  // without making every student clear an unnecessary third coordinate.
  const [dims, setDims] = useState<Dims>(2);
  const [values, setValues] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(fields.map((f) => [f.id, blank(f)])),
  );

  function setComponent(fieldId: string, index: number, raw: string) {
    setValues((prev) => {
      const next = [...prev[fieldId]];
      next[index] = raw;
      return { ...prev, [fieldId]: next };
    });
  }

  const { parsed, complete } = useMemo(() => {
    const nextParsed: Record<string, number[]> = {};
    let nextComplete = fields.length > 0;
    for (const f of fields) {
      const width = f.kind === 'ratio' ? 2 : f.kind === 'number' ? 1 : dims;
      const comps = values[f.id].slice(0, width);
      if (f.kind === 'number' && f.optional) {
        // Blank is a value not given, not a reason to disable submitting.
        const raw = (comps[0] ?? '').trim();
        if (raw === '') {
          nextParsed[f.id] = [];
          continue;
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) nextComplete = false;
        nextParsed[f.id] = [n];
        continue;
      }
      const nums = comps.map((s) => Number(s.trim()));
      if (
        comps.some((s) => s.trim() === '') ||
        nums.some((n) => !Number.isFinite(n))
      )
        nextComplete = false;
      nextParsed[f.id] = nums;
    }
    // "Fill in what you know" needs enough of the optional fields, not all —
    // but only when every field is optional; a required field already
    // guarantees there's something to solve.
    if (allOptional && !fields.some((f) => nextParsed[f.id].length > 0)) {
      nextComplete = false;
    }
    return { parsed: nextParsed, complete: nextComplete };
  }, [allOptional, dims, fields, values]);

  const serialized = useMemo(
    () => (method.serialize ? method.serialize(parsed) : ''),
    [method, parsed],
  );
  const liveResult = useMemo<SolveResult | null>(() => {
    if (!solver || !serialized) return null;
    return solver.solve(serialized, method.id);
  }, [method.id, serialized, solver]);

  // Calculator solvers can return every safely derived field in one pass.
  // Feed those values back only into blank boxes, leaving everything the
  // student typed untouched. The answer-text fallback keeps older optional
  // methods compatible while they are migrated to the richer contract.
  useEffect(() => {
    if (!liveResult?.ok) return;
    const derived = liveResult.solution.derivedValues;
    if (derived) {
      const updates: Record<string, string[]> = {};
      for (const field of fields) {
        const value = derived[field.id];
        if (
          field.kind === 'number' &&
          Number.isFinite(value) &&
          values[field.id][0].trim() === ''
        ) {
          updates[field.id] = [displayDerived(value)];
        }
      }
      if (Object.keys(updates).length > 0) {
        setValues((prev) => ({ ...prev, ...updates }));
        return;
      }
    }

    if (!allOptional) return;
    const answer = liveResult.solution.answerLatex;
    if (!answer) return;
    const match = answer.match(/\b([a-zA-Z])\s*=\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return;
    const field = fields.find((f) => f.id === match[1]);
    if (!field || field.kind !== 'number' || values[field.id][0].trim() !== '')
      return;
    setValues((prev) => ({ ...prev, [field.id]: [match[2]] }));
  }, [allOptional, fields, liveResult, values]);

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
        <div
          className="dims-toggle"
          role="radiogroup"
          aria-label="Number of dimensions"
        >
          <button
            type="button"
            aria-pressed={dims === 2}
            onClick={() => setDims(2)}
          >
            2D
          </button>
          <button
            type="button"
            aria-pressed={dims === 3}
            onClick={() => setDims(3)}
          >
            3D
          </button>
        </div>
      )}

      {allOptional && (
        <p className="setting-hint">
          Fill in what you know — any missing value that can be found is filled
          in automatically.
        </p>
      )}

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
              <span className="ratio-colon" aria-hidden="true">
                :
              </span>
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

      <CalculatorPreview result={liveResult} />

      <button type="submit" className="btn-primary" disabled={!complete}>
        Solve
      </button>
    </form>
  );
}
