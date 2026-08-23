import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
  methodPicker,
}: {
  method: Method;
  solver?: Solver;
  onSubmit: (serialized: string) => void;
  methodPicker?: ReactNode;
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
  const [derivedFields, setDerivedFields] = useState<Set<string>>(
    () => new Set(),
  );

  function setComponent(fieldId: string, index: number, raw: string) {
    setValues((prev) => {
      // A calculated value belongs to the previous set of givens. Clear all
      // calculated boxes before applying the student's edit so stale values
      // can never be submitted as if they were new givens.
      const nextValues = { ...prev };
      for (const derivedId of derivedFields) {
        nextValues[derivedId] = blank(
          fields.find((field) => field.id === derivedId)!,
        );
      }
      const next = [...nextValues[fieldId]];
      next[index] = raw;
      nextValues[fieldId] = next;
      return nextValues;
    });
    if (derivedFields.size > 0) setDerivedFields(new Set());
  }

  const { parsed, complete } = useMemo(() => {
    const nextParsed: Record<string, number[]> = {};
    let nextComplete = fields.length > 0;
    for (const f of fields) {
      const width = f.kind === 'ratio' ? 2 : f.kind === 'number' ? 1 : dims;
      const comps = values[f.id].slice(0, width);
      if (f.kind === 'number' && f.optional) {
        // Blank is a value not given, not a reason to disable submitting.
        // A value filled by the live solver is display-only until the
        // student edits it. Excluding it here keeps every recalculation based
        // solely on the current givens.
        if (derivedFields.has(f.id)) {
          nextParsed[f.id] = [];
          continue;
        }
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
  }, [allOptional, derivedFields, dims, fields, values]);

  const serialized = useMemo(
    () => (complete && method.serialize ? method.serialize(parsed) : ''),
    [complete, method, parsed],
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
      const nextDerived = new Set(derivedFields);
      for (const field of fields) {
        const value = derived[field.id];
        if (
          field.kind === 'number' &&
          Number.isFinite(value) &&
          (values[field.id][0].trim() === '' || derivedFields.has(field.id))
        ) {
          const display = displayDerived(value);
          if (values[field.id][0] !== display) updates[field.id] = [display];
          nextDerived.add(field.id);
        }
      }
      if (Object.keys(updates).length > 0) {
        setValues((prev) => ({ ...prev, ...updates }));
      }
      if (nextDerived.size !== derivedFields.size)
        setDerivedFields(nextDerived);
      if (Object.keys(updates).length > 0 || nextDerived.size > 0) return;
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
    setDerivedFields((prev) => new Set(prev).add(field.id));
  }, [allOptional, derivedFields, fields, liveResult, values]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete || !method.serialize) return;
    onSubmit(method.serialize(parsed));
  }

  const fixedFields = fields.filter((f) => f.kind !== 'number');
  const numberFields = fields.filter((f) => f.kind === 'number');
  const hasDiagram = [
    'collinear',
    'ratio',
    'pythagoras',
    'trig-ratio',
    'sine-rule',
    'cosine-rule',
    'area',
    'measurements',
    'arc-sector',
    'chord',
    'centre-angle',
    'cyclic',
    'same-segment',
    'semicircle',
    'tangent-radius',
    'equal-tangents',
    'equal-chords',
    'tangent-chord',
    'chord-distance',
    'tangent-length',
    'intersecting-chords',
    'power-of-point',
  ].includes(method.id);
  const isTriangle = [
    'pythagoras',
    'trig-ratio',
    'sine-rule',
    'cosine-rule',
    'area',
  ].includes(method.id);

  function clearValues() {
    setDims(2);
    setValues(Object.fromEntries(fields.map((f) => [f.id, blank(f)])));
    setDerivedFields(new Set());
  }

  function isInvalid(raw: string): boolean {
    return raw.trim() !== '' && !Number.isFinite(Number(raw.trim()));
  }

  function fieldLabel(field: FieldSchema): string {
    if (!isTriangle) return field.label;
    if (/^[abc]$/.test(field.id)) return `Side ${field.label}`;
    if (/^[ABC]$/.test(field.id)) return `Angle ${field.label}°`;
    return field.label;
  }

  return (
    <form
      className={`structured-form${hasDiagram ? ' structured-form--diagram' : ''}${isTriangle ? ' structured-form--triangle' : ''}`}
      onSubmit={submit}
    >
      <div className="calculator-layout">
        {hasDiagram && (
          <div className="calculator-reference">
            <MethodDiagram methodId={method.id} />
          </div>
        )}

        <div
          className={`calculator-fields${fixedFields.length > 1 ? ` calculator-fields--multiple calculator-fields--fixed-${fixedFields.length}` : ''}`}
        >
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

          {fixedFields.map((f) => (
            <div className="structured-field" key={f.id}>
              <span className="field-label">{fieldLabel(f)}</span>
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
                      aria-invalid={isInvalid(v) || undefined}
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
                    aria-invalid={isInvalid(values[f.id][0]) || undefined}
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
                    aria-invalid={isInvalid(values[f.id][1]) || undefined}
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
                  <label className="field-label" htmlFor={`field-${f.id}`}>
                    {fieldLabel(f)}
                  </label>
                  <input
                    id={`field-${f.id}`}
                    className={`expr-input num-input${derivedFields.has(f.id) ? ' num-input--derived' : ''}`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-label={f.label}
                    aria-invalid={isInvalid(values[f.id][0]) || undefined}
                    title={
                      derivedFields.has(f.id)
                        ? 'Automatically calculated. Edit to use it as a given value.'
                        : undefined
                    }
                    value={values[f.id][0]}
                    onChange={(e) => setComponent(f.id, 0, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CalculatorPreview result={liveResult} />

      {methodPicker}

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
