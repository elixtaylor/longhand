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
   * .step-expr now shares a flex row with .step-annotation (see .step-line
   * in base.css), so it needs a real width to offer that row. In the
   * notebook theme its content is taken out of flow by position:absolute
   * (an annotation sitting beside a *content-independent, bottom-anchored*
   * line of maths, rather than below it, needs that positioning — see
   * base.css for why), and out-of-flow content never contributes to a
   * parent's size — .step-expr collapsed to zero width and its maths
   * vanished entirely.
   *
   * The obvious fix — measure the katex-display's own rendered width — does
   * not work: KaTeX's own stylesheet makes display-mode .katex itself
   * `display: block`, sized to *its* container in exactly the same way,
   * rather than to its content. Every element in this chain fills its
   * parent; none of them shrink-wraps, so getBoundingClientRect().width is
   * 0 all the way down. scrollWidth is different — with white-space:nowrap
   * (which KaTeX sets) it reports the width the unwrapped content actually
   * needs regardless of how narrow the box computed itself to be, which is
   * exactly the real content width this needs.
   *
   * Scoped to the notebook theme by checking the theme directly (matching
   * measureGrid below) rather than the shape of the box: elsewhere
   * .katex-display is a normal in-flow block and flexbox's own auto-sizing
   * already measures it correctly, and a switch away from notebook has to
   * let go of its measured width rather than leave it behind to override
   * the next theme's own sizing.
   *
   * Also depends on `revealed`, not just `solution`: a step past the old
   * solution's step count starts out `is-hidden` (display:none) for one
   * render, because the effect below that grows `revealed` back up to the
   * new total fires *after* this one and only takes effect next paint.
   * scrollWidth on a display:none subtree is 0, so measuring on the
   * `solution`-only commit permanently baked in a 0px width for every step
   * beyond the previous solution's length — the maths was there, just
   * zero-width. Re-running once `revealed` actually reaches that step
   * re-measures it while it's genuinely visible.
   *
   * KaTeX's own delimiter fonts (KaTeX_Size1-4 — the big parentheses in a
   * \binom, a determinant's bars, a tall radical) are a second, independent
   * reason a first measurement can be wrong, and one no amount of retriggering
   * on `solution`/`revealed` catches: those fonts aren't in the theme's own
   * handwriting override (only the letter/digit faces are, see themes.css),
   * and the browser only *starts* fetching each one the first time a glyph
   * needs it — typically after this effect's synchronous measurement has
   * already run and returned a width measured against a fallback glyph.
   * Nothing about the page visibly changes when that fetch completes, so
   * nothing else would ever prompt a re-measure — the box just quietly kept
   * the wrong, too-narrow number for the rest of the session. Re-running
   * once those fonts actually finish loading is the only way to catch it.
   *
   * Height is measured here too, and for the same reason width is: a plain
   * line and a 3×3 determinant both need to sit in a box quantised to whole
   * --rule squares (see base.css), but they don't need the *same* box — a
   * fixed guess is always either wasted space on short lines or a clipped
   * determinant. base.css's own min-height covers the ordinary case (two
   * squares) as the default this falls back to before the first measurement
   * and if this ever measures zero; scrollHeight (unlike scrollWidth, this
   * one isn't fighting a stretched box — .katex-display's height was never
   * the problem, only its width was) reports what the content actually
   * needs, rounded up to the next whole square so the ruling still lands
   * under the maths.
   */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function measure() {
      const exprs = list!.querySelectorAll<HTMLElement>('.step-expr');
      if (document.documentElement.dataset.theme !== 'notebook') {
        exprs.forEach((exprEl) => {
          exprEl.style.removeProperty('width');
          exprEl.style.removeProperty('height');
        });
        return;
      }
      exprs.forEach((exprEl) => {
        const katex = exprEl.querySelector<HTMLElement>('.katex-display > .katex');
        if (!katex) return;
        exprEl.style.width = `${katex.scrollWidth}px`;
        if (katex.scrollHeight > 0) {
          const squares = Math.max(2, Math.ceil(katex.scrollHeight / RULE));
          exprEl.style.height = `${squares * RULE}px`;
        }
      });
    }

    measure();
    document.fonts.ready.then(measure);
    document.fonts.addEventListener('loadingdone', measure);
    const themeObserver = new MutationObserver(measure);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
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
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    measureGrid();
    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  const allShown = revealed >= total;

  async function copyWorking() {
    const lines = [stripMath(solution.headline)];
    solution.steps.forEach((s, i) => {
      // Copy what is on screen: with explanations hidden, a bare list of
      // lines is exactly what a student wants to paste into their book.
      if (s.note && showNotes) lines.push(`${i + 1}. ${stripMath(s.note)}`);
      if (s.latex) lines.push(showNotes ? `    ${s.latex}` : s.latex);
    });
    if (solution.answerLatex) lines.push(`Answer:  ${solution.answerLatex}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div>
      <ol className="steps" ref={listRef}>
        {solution.steps.map((step, i) => {
          const hidden = i >= revealed;
          return (
            <li key={i} className={`step${hidden ? ' is-hidden' : ''}`}>
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
                        <span className="step-annotation-text">{step.annotation}</span>
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
          <button type="button" className="btn" onClick={() => setRevealed((r) => r + 1)}>
            Reveal next step
          </button>
        )}
        {revealMode === 'step' && !allShown && (
          <button type="button" className="btn" onClick={() => setRevealed(total)}>
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
