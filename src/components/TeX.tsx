import { createContext, useContext, useMemo } from 'react';
import katex from 'katex';
import { decimaliseLatex } from '../lib/math/display';
import type { DisplayMode } from '../lib/ui';

export const DisplayModeContext = createContext<DisplayMode>('exact');

/** Render a LaTeX string to KaTeX HTML (never throws — shows the source on error). */
export function texToHtml(tex: string, display: boolean): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    displayMode: display,
    output: 'html',
    strict: false,
  });
}

export function TeX({
  tex,
  display = false,
  className,
}: {
  tex: string;
  display?: boolean;
  className?: string;
}) {
  const displayMode = useContext(DisplayModeContext);
  const shown = displayMode === 'decimal' ? decimaliseLatex(tex) : tex;
  const html = useMemo(() => texToHtml(shown, display), [shown, display]);
  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/** Text that may contain inline maths delimited by $...$. */
export function RichText({ text }: { text: string }) {
  const parts = useMemo(() => splitInlineMath(text), [text]);
  return (
    <>
      {parts.map((p, i) =>
        p.isMath ? (
          <TeX key={i} tex={p.value} />
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </>
  );
}

interface Segment {
  isMath: boolean;
  value: string;
}
function splitInlineMath(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\$([^$]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last)
      out.push({ isMath: false, value: text.slice(last, m.index) });
    out.push({ isMath: true, value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ isMath: false, value: text.slice(last) });
  return out;
}
