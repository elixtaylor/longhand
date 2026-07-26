import { useCallback, useEffect, useRef, useState } from 'react';
import { solvers, getSolver } from '../lib/engine/registry';
import { interpret, runSolve } from '../lib/engine/run';
import type { SolveResult, Solver } from '../lib/engine/types';
import type { RevealMode } from '../lib/ui';
import { examplesFor, type Example } from '../data/examples';
import { importedFor, sourceOf } from '../data/imported';
import { formulasFor } from '../data/formulas';
import {
  loadHistory,
  pushHistory,
  clearHistory,
  decodeShare,
  encodeShare,
  shareUrl,
  type HistoryEntry,
} from '../lib/history';
import { TopicMethodPicker } from './TopicMethodPicker';
import { ProblemInput } from './ProblemInput';
import { StepList } from './StepList';
import { CompareMethods } from './CompareMethods';
import { TeX, RichText } from './TeX';

type Mode = 'auto' | 'manual';

export function Workspace({ revealMode }: { revealMode: RevealMode }) {
  const shared = typeof window !== 'undefined' ? decodeShare(window.location.hash) : null;

  const [mode, setMode] = useState<Mode>(shared?.solverId ? 'manual' : 'auto');
  const [solverId, setSolverId] = useState(shared?.solverId ?? solvers[0].id);
  const [methodId, setMethodId] = useState(
    shared?.methodId ?? getSolver(shared?.solverId ?? '')?.defaultMethodId ?? solvers[0].defaultMethodId,
  );
  const [input, setInput] = useState(shared?.input ?? '');
  const [result, setResult] = useState<SolveResult | null>(null);
  const [detected, setDetected] = useState<Solver | null>(null);
  /** The canonical rewrite of what was typed, shown when it differs. */
  const [reading, setReading] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [comparing, setComparing] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasSolved = useRef(false);

  const solveWith = useCallback((sid: string, mid: string, value: string) => {
    const solver = getSolver(sid);
    if (!solver || value.trim() === '') {
      setResult(null);
      hasSolved.current = false;
      return;
    }
    setResult(runSolve(solver, value, mid));
    hasSolved.current = true;
  }, []);

  /** Solving is the moment worth recording and worth making shareable. */
  const commit = useCallback(
    (sid: string, mid: string, value: string) => {
      solveWith(sid, mid, value);
      if (value.trim() === '') return;
      setHistory(pushHistory({ input: value, solverId: sid, methodId: mid, at: Date.now() }));
      window.history.replaceState(null, '', encodeShare({ input: value, solverId: sid, methodId: mid }));
    },
    [solveWith],
  );

  // Restore a shared link on first load.
  useEffect(() => {
    if (shared?.input) solveWith(shared.solverId ?? solverId, shared.methodId ?? methodId, shared.input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Pasting a shared link into a tab that already has Longhand open changes
   * only the fragment, so the page never reloads. Without this the link would
   * silently do nothing.
   */
  useEffect(() => {
    function onHashChange() {
      const next = decodeShare(window.location.hash);
      if (!next?.input) return;
      const sid = next.solverId ?? solverId;
      const mid = next.methodId ?? getSolver(sid)?.defaultMethodId ?? methodId;
      if (next.solverId) setMode('manual');
      setSolverId(sid);
      setMethodId(mid);
      setInput(next.input);
      solveWith(sid, mid, next.input);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solverId, methodId, solveWith]);

  /**
   * In auto mode the topic follows what the student types, live. Detection
   * only changes the method when it lands on a different topic, so a chosen
   * method survives further edits to the same problem.
   */
  useEffect(() => {
    const { detection, text, rewritten } = interpret(input);
    // Show the rewrite whenever plain English was turned into maths, so the
    // student can see exactly what was understood — and correct it if wrong.
    setReading(rewritten && input.trim() !== '' ? text : null);
    if (mode !== 'auto') return;
    setDetected(detection?.solver ?? null);
    if (detection && detection.solver.id !== solverId) {
      setSolverId(detection.solver.id);
      setMethodId(detection.solver.defaultMethodId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, mode]);

  // Once there's working on screen, keep it in step with further edits.
  useEffect(() => {
    if (hasSolved.current) solveWith(solverId, methodId, input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, solverId, methodId]);

  function selectSolver(id: string) {
    const solver = getSolver(id);
    if (!solver) return;
    setSolverId(id);
    setMethodId(solver.defaultMethodId);
    setResult(null);
    hasSolved.current = false;
  }

  function loadExample(ex: Example) {
    const mid = ex.methodId ?? getSolver(ex.solverId)?.defaultMethodId ?? methodId;
    setSolverId(ex.solverId);
    setMethodId(mid);
    setInput(ex.input);
    commit(ex.solverId, mid, ex.input);
  }

  function loadHistoryEntry(h: HistoryEntry) {
    setMode('manual');
    setSolverId(h.solverId);
    setMethodId(h.methodId);
    setInput(h.input);
    solveWith(h.solverId, h.methodId, h.input);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl({ input, solverId, methodId }));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the URL bar already holds the link */
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    if (next === 'auto') {
      const { detection } = interpret(input);
      setDetected(detection?.solver ?? null);
      if (detection) {
        setSolverId(detection.solver.id);
        setMethodId(detection.solver.defaultMethodId);
      }
    }
  }

  const solver = getSolver(solverId)!;
  const autoUnknown = mode === 'auto' && input.trim() !== '' && !detected;

  return (
    <main className="worksheet">
      <aside className="controls">
        <section className="panel">
          <div className="mode-row">
            <div className="segmented" role="group" aria-label="How to choose the topic">
              <button
                type="button"
                aria-pressed={mode === 'auto'}
                onClick={() => switchMode('auto')}
              >
                Work it out for me
              </button>
              <button
                type="button"
                aria-pressed={mode === 'manual'}
                onClick={() => switchMode('manual')}
              >
                Choose topic
              </button>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              commit(solverId, methodId, input);
            }}
          >
            <ProblemInput
              value={input}
              onChange={setInput}
              placeholder={
                mode === 'auto' ? 'Ask in plain English — “area of a circle with radius 5”' : solver.placeholder
              }
              preview={reading}
            />

            {reading && (
              <p className="reading" role="status">
                <span className="reading-label">Read as</span>
                <code className="reading-text">{reading}</code>
              </p>
            )}

            {mode === 'auto' && detected && (
              <p className="detected" role="status">
                <span className="detected-dot" aria-hidden="true" />
                Detected: <strong>{detected.title}</strong>
                <span className="detected-sub">{detected.subjects.join(' · ')}</span>
              </p>
            )}
            {autoUnknown && (
              <p className="detected detected-unknown" role="status">
                Not sure what this one is yet — try “Choose topic”.
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: 'var(--sp-4)' }}
              disabled={input.trim() === '' || (mode === 'auto' && !detected)}
            >
              Show the working
            </button>
          </form>
        </section>

        <section className="panel">
          <TopicMethodPicker
            solvers={solvers}
            solverId={solverId}
            onSelectSolver={selectSolver}
            methodId={methodId}
            onSelectMethod={setMethodId}
            showTopics={mode === 'manual'}
          />
        </section>

        <section className="panel">
          <div className="panel-title">Try one</div>
          <div className="examples">
            {examplesFor(solverId).map((ex) => (
              <button
                key={ex.label}
                type="button"
                className="example-row"
                onClick={() => loadExample(ex)}
              >
                <span className="example-expr">{ex.label}</span>
                <span className="example-tag">{ex.subject}</span>
              </button>
            ))}
          </div>
        </section>

        {importedFor(solverId).length > 0 && (
          <section className="panel">
            <div className="panel-title">
              Textbook questions ({importedFor(solverId).length})
            </div>
            <div className="examples examples-scroll">
              {importedFor(solverId).map((p) => (
                <button
                  key={p.ref}
                  type="button"
                  className="example-row"
                  onClick={() => {
                    setSolverId(p.solverId);
                    setMethodId(p.methodId ?? getSolver(p.solverId)!.defaultMethodId);
                    setInput(p.input);
                    commit(p.solverId, p.methodId ?? getSolver(p.solverId)!.defaultMethodId, p.input);
                  }}
                >
                  <span className="example-expr">{p.label}</span>
                  <span className="example-tag">{p.ref}</span>
                </button>
              ))}
            </div>
            <p className="attribution">
              Questions from{' '}
              <a href={sourceOf(importedFor(solverId)[0]).url} target="_blank" rel="noreferrer">
                {sourceOf(importedFor(solverId)[0]).title}
              </a>{' '}
              ({sourceOf(importedFor(solverId)[0]).publisher}), used under{' '}
              <a href={sourceOf(importedFor(solverId)[0]).licenceUrl} target="_blank" rel="noreferrer">
                {sourceOf(importedFor(solverId)[0]).licence}
              </a>
              . All working is Longhand’s own.
            </p>
          </section>
        )}

        {formulasFor(solverId).length > 0 && (
          <section className="panel">
            <div className="panel-title">Formulas — {solver.title}</div>
            <dl className="formula-list">
              {formulasFor(solverId).map((f) => (
                <div key={f.name} className="formula-row">
                  <dt>{f.name}</dt>
                  <dd>
                    <TeX tex={f.latex} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {history.length > 0 && (
          <section className="panel">
            <div className="panel-title panel-title-row">
              Recent
              <button
                type="button"
                className="link-btn"
                onClick={() => setHistory(clearHistory())}
              >
                Clear
              </button>
            </div>
            <div className="examples">
              {history.slice(0, 8).map((h) => (
                <button
                  key={`${h.at}-${h.input}`}
                  type="button"
                  className="example-row"
                  onClick={() => loadHistoryEntry(h)}
                  title={h.input}
                >
                  <span className="example-expr">{truncate(h.input, 30)}</span>
                  <span className="example-tag">{getSolver(h.solverId)?.title ?? ''}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </aside>

      <section className="solution" aria-live="polite">
        {comparing && result?.ok ? (
          <>
            <header className="solution-head">
              <div>
                <div className="solution-title">
                  <RichText text={result.solution.headline} />
                </div>
                <div className="solution-sub">
                  Comparing all <em>{solver.methods.length}</em> methods
                </div>
              </div>
              <div className="solution-tools">
                <button type="button" className="btn" onClick={() => setComparing(false)}>
                  Back to one method
                </button>
              </div>
            </header>
            <CompareMethods solver={solver} input={input} />
          </>
        ) : (
          <SolutionView
            result={result}
            revealMode={revealMode}
            canCompare={solver.methods.length > 1 && !!result?.ok}
            onCompare={() => setComparing(true)}
            onCopyLink={copyLink}
            copied={copied}
          />
        )}
      </section>
    </main>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function SolutionView({
  result,
  revealMode,
  canCompare,
  onCompare,
  onCopyLink,
  copied,
}: {
  result: SolveResult | null;
  revealMode: RevealMode;
  canCompare: boolean;
  onCompare: () => void;
  onCopyLink: () => void;
  copied: boolean;
}) {
  if (!result) {
    return (
      <div className="empty-state">
        <div className="empty-glyph">∴</div>
        <h2>Your working will appear here</h2>
        <p>
          Type your problem and Longhand works out what topic it is, then shows every line —
          worked out exactly, using the method you were taught.
        </p>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="empty-state">
        <div className="empty-glyph">≠</div>
        <h2>I couldn’t read that one</h2>
        <p>{result.error}</p>
      </div>
    );
  }

  const { solution } = result;
  return (
    <div>
      <header className="solution-head">
        <div>
          <div className="solution-title">
            <RichText text={solution.headline} />
          </div>
          <div className="solution-sub">
            Method: <em>{solution.methodName}</em>
          </div>
          <div className="solution-tools" style={{ marginTop: 'var(--sp-3)' }}>
            {canCompare && (
              <button type="button" className="btn" onClick={onCompare}>
                Compare all methods
              </button>
            )}
            <button type="button" className="btn" onClick={onCopyLink}>
              {copied ? 'Link copied ✓' : 'Copy link'}
            </button>
          </div>
        </div>
        {solution.answerLatex && (
          <div className="answer-card">
            <span className="answer-label">Answer</span>
            <span className="answer-value">
              <TeX tex={solution.answerLatex} />
            </span>
          </div>
        )}
      </header>
      <StepList solution={solution} revealMode={revealMode} />
    </div>
  );
}
