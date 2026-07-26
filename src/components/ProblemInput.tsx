import { useRef } from 'react';
import { TeX } from './TeX';

interface Key {
  label: string;
  insert: string;
  caretBack?: number; // move caret left this many chars after inserting
}

const KEYS: Key[] = [
  { label: 'x', insert: 'x' },
  { label: 'x²', insert: 'x^2' },
  { label: 'xⁿ', insert: 'x^', },
  { label: '( )', insert: '()', caretBack: 1 },
  { label: '+', insert: '+' },
  { label: '−', insert: '-' },
  { label: '×', insert: '*' },
  { label: '÷', insert: '/' },
  { label: '=', insert: '=' },
];

/**
 * Words that belong in a mathematical expression. Anything else of three or
 * more letters means the input is prose, which KaTeX would set as a run of
 * italic letters — unreadable. Prose is shown as plain text instead.
 */
const MATH_WORDS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'log', 'ln', 'exp', 'sqrt', 'abs',
  'det', 'pi', 'dx', 'dy', 'dt', 'lim', 'sum', 'int', 'max', 'min', 'mod',
]);

export function isExpression(text: string): boolean {
  const words = text.match(/[A-Za-z]{3,}/g) ?? [];
  return words.every((w) => MATH_WORDS.has(w.toLowerCase()));
}

export function ProblemInput({
  value,
  onChange,
  placeholder,
  preview,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Canonical rewrite to preview instead of the raw text, when there is one. */
  preview?: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function insert(key: Key) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + key.insert + value.slice(end);
    onChange(next);
    const caret = start + key.insert.length - (key.caretBack ?? 0);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  }

  // Preview the canonical rewrite when there is one — that is the maths the
  // solver will actually see.
  const trimmed = (preview ?? value).trim();

  return (
    <div>
      <label className="field-label" htmlFor="problem">
        Your problem
      </label>
      <input
        id="problem"
        ref={ref}
        className="expr-input"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="palette" role="group" aria-label="Insert symbol">
        {KEYS.map((k) => (
          <button
            key={k.label}
            type="button"
            className="palette-key"
            onClick={() => insert(k)}
            tabIndex={-1}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="preview" aria-live="polite">
        <span className="preview-label">Preview</span>
        <span className="preview-body">
          {trimmed === '' ? (
            <span className="preview-empty">Start typing — plain English is fine…</span>
          ) : isExpression(trimmed) ? (
            <TeX tex={trimmed} display />
          ) : (
            <span className="preview-plain">{trimmed}</span>
          )}
        </span>
      </div>
    </div>
  );
}
