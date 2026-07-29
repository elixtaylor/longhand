import { useEffect, useRef, useState } from 'react';
import type { Solution } from '../lib/engine/types';
import type { RevealMode } from '../lib/ui';
import { TeX, RichText } from './TeX';
import { StepVisualView } from './visuals';

/** The notebook theme's squared-paper tile, in px — literally, not measured;
 * see measureGrid's own doc comment below for why it can't be. */
const RULE = 24;

export function StepList({
  solution,
  revealMode,
  showNotes,
  canCompare,
  onCompare,
  onCopyLink,
  copied,
}: {
  solution: Solution;
  revealMode: RevealMode;
  /** Whether each line's "why" is shown. Off by default; see App. */
  showNotes: boolean;
  /** Omitted by callers (e.g. one part of a multi-part question) that don't offer these. */
  canCompare?: boolean;
  onCompare?: () => void;
  onCopyLink?: () => void;
  copied?: boolean;
}) {
  const total = solution.steps.length;
  const [revealed, setRevealed] = useState(total);
  const listRef = useRef<HTMLOListElement>(null);

  // Reset the reveal counter whenever a new solution arrives or the mode changes.
  useEffect(() => {
    setRevealed(revealMode === 'all' ? total : Math.min(1, total));
  }, [solution, revealMode, total]);

  /**
   * The notebook theme still needs to measure each line's height so its
   * squared-paper ruling stays aligned. Width is deliberately left to CSS:
   * the working area now grows on wide screens and equations share the full
   * available row instead of creating an inner horizontal scrollbar. If a
   * very long line still exceeds a narrow viewport, the rendered maths is
   * scaled to fit rather than making the page scroll sideways.
   */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function measure() {
      const exprs = list!.querySelectorAll<HTMLElement>('.step-expr');
      const notebook = document.documentElement.dataset.theme === 'notebook';
      exprs.forEach((exprEl) => {
        const katex = exprEl.querySelector<HTMLElement>(
          '.katex-display > .katex',
        );
        if (!katex) {
          exprEl.style.removeProperty('height');
          return;
        }
        katex.style.removeProperty('transform');
        katex.style.removeProperty('transform-origin');
        const availableWidth = exprEl.clientWidth;
        const naturalWidth = katex.scrollWidth;
        if (availableWidth > 0 && naturalWidth > availableWidth) {
          const scale = availableWidth / naturalWidth;
          katex.style.transformOrigin = 'left bottom';
          katex.style.transform = `scale(${scale})`;
        }
        if (!notebook) {
          exprEl.style.removeProperty('height');
        } else if (katex.scrollHeight > 0) {
          const squares = Math.max(2, Math.ceil(katex.scrollHeight / RULE));
          exprEl.style.height = `${squares * RULE}px`;
        }
      });
    }

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(list);
    document.fonts.ready.then(measure);
    document.fonts.addEventListener('loadingdone', measure);
    const themeObserver = new MutationObserver(measure);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      resizeObserver.disconnect();
      document.fonts.removeEventListener('loadingdone', measure);
      themeObserver.disconnect();
    };
  }, [solution, revealed]);

  /**
   * The notebook theme's squared paper tiles at a fixed --rule (24px) in
   * both directions, and the list's own width is essentially never an exact
   * multiple of that — so one edge column was always a partial square.
   * Centring (see .steps in base.css) split that partial column evenly
   * onto both edges, which reads as tidier, but a partial square is still a
   * partial square.
   *
   * The vertical tile size can't be adjusted to fix this the same way —
   * every other measurement in this theme (.step-expr's min-height, the
   * badge column, the connector) is quantised to the *literal* --rule value
   * in themes.css, and the baseline sits on the ruling at a fixed offset
   * from it (--rule-baseline). Changing the tile height, even slightly,
   * would decouple the drawn ruling from where the maths actually sits —
   * reintroducing the exact drift bug --rule-baseline exists to prevent.
   *
   * Horizontally there's no such constraint: nothing else keys off a
   * specific vertical *line's* position. So the fix has two, independent
   * halves — measured, because neither is knowable from CSS alone:
   *  - Divide the list's actual width by the nearest whole number of
   *    columns, and use that (not --rule) as the tile width. The squares
   *    end up ~24px rather than exactly 24px, invisibly so, but an exact
   *    number of them now fits with no partial column at either edge.
   *  - Pad the bottom up to the next whole multiple of --rule, so the
   *    background tiles a complete (blank) final row instead of a partial
   *    one — the padding is inert; nothing is anchored to the list's own
   *    bottom edge, unlike the horizontal case.
   */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function measureGrid() {
      if (!list) return;
      if (document.documentElement.dataset.theme !== 'notebook') {
        list.style.removeProperty('--grid-col-w');
        list.style.paddingBottom = '';
        return;
      }
      // Reset before measuring — otherwise a previous run's own padding
      // would be counted as part of the "natural" content height below.
      // getBoundingClientRect, not scrollHeight, for the height: scrollHeight
      // rounds to a whole pixel, and that alone was enough to leave a
      // fraction-of-a-pixel sliver at the bottom on some content.
      list.style.paddingBottom = '0px';
      const width = list.clientWidth;
      const naturalHeight = list.getBoundingClientRect().height;
      const cols = Math.max(1, Math.round(width / RULE));
      const remainder = naturalHeight % RULE;
      list.style.setProperty('--grid-col-w', `${width / cols}px`);
      list.style.paddingBottom = `${remainder < 0.01 ? 0 : RULE - remainder}px`;
    }

    const resizeObserver = new ResizeObserver(measureGrid);
    resizeObserver.observe(list);
    // Toggling the theme in Settings changes data-theme without resizing
    // anything, but still needs this to switch on/off or re-measure.
    const themeObserver = new MutationObserver(measureGrid);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    measureGrid();
    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  const allShown = revealed >= total;

  async function copyWorking() {
    const lines = workingText(solution, showNotes);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  function downloadWorking() {
    const blob = new Blob([workingText(solution, showNotes).join('\n')], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'longhand-working.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <ol className="steps" ref={listRef}>
        {solution.steps.map((step, i) => {
          const hidden = i >= revealed;
          const sameOperation = /same to both sides|both sides/i.test(
            `${step.annotation ?? ''} ${step.note ?? ''}`,
          );
          return (
            <li
              key={i}
              className={`step${hidden ? ' is-hidden' : ''}${sameOperation ? ' step-operation' : ''}`}
            >
              <div className="step-body">
                {step.note && showNotes && (
                  <p className="step-note">
                    <RichText text={step.note} />
                  </p>
                )}
                {(step.latex || step.annotation) && (
                  <div className="step-line">
                    {step.latex && (
                      <div className="step-expr">
                        <TeX tex={step.latex} display />
                      </div>
                    )}
                    {step.annotation && (
                      <span className="step-annotation">
                        <span className="step-annotation-text">
                          {step.annotation}
                        </span>
                      </span>
                    )}
                  </div>
                )}
                {step.visual && <StepVisualView visual={step.visual} />}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="reveal-controls">
        {canCompare && onCompare && (
          <button type="button" className="btn" onClick={onCompare}>
            Compare all methods
          </button>
        )}
        {onCopyLink && (
          <button type="button" className="btn" onClick={onCopyLink}>
            {copied ? 'Link copied ✓' : 'Copy link'}
          </button>
        )}
        {revealMode === 'step' && !allShown && (
          <button
            type="button"
            className="btn"
            onClick={() => setRevealed((r) => r + 1)}
          >
            Reveal next step
          </button>
        )}
        {revealMode === 'step' && !allShown && (
          <button
            type="button"
            className="btn"
            onClick={() => setRevealed(total)}
          >
            Show all
          </button>
        )}
        {revealMode === 'step' && allShown && total > 1 && (
          <button type="button" className="btn" onClick={() => setRevealed(1)}>
            Collapse
          </button>
        )}
        <button type="button" className="btn" onClick={copyWorking}>
          Copy working
        </button>
        <button type="button" className="btn" onClick={downloadWorking}>
          Download .txt
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          Print
        </button>
        <span className="reveal-count">
          {Math.min(revealed, total)} / {total} steps
        </span>
      </div>
    </div>
  );
}

/** Rough text version of an inline-math string for the clipboard. */
function stripMath(text: string): string {
  return text.replace(/\$/g, '');
}

function workingText(solution: Solution, showNotes: boolean): string[] {
  const lines = [stripMath(solution.headline)];
  solution.steps.forEach((s, i) => {
    if (s.note && showNotes) lines.push(`${i + 1}. ${stripMath(s.note)}`);
    if (s.latex) lines.push(showNotes ? `    ${s.latex}` : s.latex);
  });
  if (solution.answerLatex) lines.push(`Answer:  ${solution.answerLatex}`);
  return lines;
}
