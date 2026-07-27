import { useRef } from 'react';
import { TeX } from './TeX';
import { isExpression } from '../lib/nl/vocabulary';
import { parseExpr, toLatex } from '../lib/math/expr';

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

/** One side of an equation, rendered through the same parser the solvers use. */
function sideToLatex(side: string): string {
  return toLatex(parseExpr(side));
}

/**
 * The typed text is not LaTeX, and KaTeX's `^` only takes a single following
 * character or a `{...}`-braced group — never a `(...)` one. So "2^(x+1)"
 * was rendered as $2$ with a tiny superscript "(", then "x+1)" back at
 * normal size: exactly backwards from what was typed, and confusing enough
 * that a correct equation looked broken before it was ever solved.
 *
 * The fix is to stop guessing at a text-to-LaTeX rewrite and instead reuse
 * `expr.ts`'s own parser — the same one the solvers use, so the preview and
 * the working can never disagree about what a bracketed exponent means. It
 * only understands one algebraic expression at a time, so each side of each
 * "=" is converted separately, and anything it can't parse yet (a question
 * that isn't algebra, or one that's still mid-type with a bracket not yet
 * closed) falls back to the old plain-text rendering rather than erroring.
 */
function toPreviewLatex(text: string): string {
  const clauses = text.split(/[;\n]/);
  try {
    return clauses
      .map((clause) => {
        const sides = clause.split('=');
        if (sides.some((s) => s.trim() === '')) throw new Error('incomplete');
        return sides.map(sideToLatex).join(' = ');
      })
      .join(' \\quad ');
  } catch {
    return forPreview(text);
  }
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
            <TeX tex={toPreviewLatex(trimmed)} display />
          ) : (
            <span className="preview-plain">{trimmed}</span>
          )}
        </span>
      </div>
    </div>
  );
}
