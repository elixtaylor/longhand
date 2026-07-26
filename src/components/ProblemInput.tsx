import { useRef } from 'react';
import { TeX } from './TeX';
import { isExpression } from '../lib/nl/vocabulary';

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

// Prose would be set by KaTeX as a run of italic letters — unreadable. It is
// shown as plain text instead. Same judgement as the parser uses, so what
// looks like maths in the preview is what the parser will accept.
export { isExpression };

/**
 * Typed maths is not LaTeX. Without this, "ln x = 5" is set as the italic
 * product l·n·x — which is what a variable looks like, so a student would
 * reasonably think their function name had not been understood.
 */
function forPreview(text: string): string {
  return text.replace(
    /\b(sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|ln|log|exp|det|min|max|lim)\b/g,
    '\\$1 ',
  );
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
            <TeX tex={forPreview(trimmed)} display />
          ) : (
            <span className="preview-plain">{trimmed}</span>
          )}
        </span>
      </div>
    </div>
  );
}
