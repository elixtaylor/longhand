import { useCallback, useEffect, useRef, useState } from 'react';
import { solvers, getSolver } from '../lib/engine/registry';
import { interpret, runWorked, type Worked } from '../lib/engine/run';
import { hasMethodChoice } from '../lib/engine/methods';
import type { SolveResult, Solver } from '../lib/engine/types';
import type { ThemeId, RevealMode, TextSize } from '../lib/ui';
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
import { StructuredInputForm } from './StructuredInputForm';
import { StepList } from './StepList';
import { CompareMethods } from './CompareMethods';
import { Sidebar } from './Sidebar';
import { PartedSolution } from './PartedSolution';
import { TeX, RichText } from './TeX';

/**
 * A topic and method the student settled on, which the engine is told to use
 * instead of detecting. Set by choosing a method, opening a shared link, or
 * pulling up a past problem — and cleared as soon as the question changes,
 * because a new question is a new question.
 */
type Pin = { solverId: string; methodId: string } | null;

export function Workspace({
  revealMode,
  onRevealMode,
  showNotes,
  onShowNotes,
  sidebarOpen,
  onSidebarClose,
  theme,
  onTheme,
  dark,
  onDark,
  textSize,
  onTextSize,
}: {
  revealMode: RevealMode;
  onRevealMode: (m: RevealMode) => void;
  showNotes: boolean;
  onShowNotes: (v: boolean) => void;
  sidebarOpen: boolean;
  onSidebarClose: () => void;
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  dark: boolean;
  onDark: (d: boolean) => void;
  textSize: TextSize;
  onTextSize: (s: TextSize) => void;
}) {
  const shared = typeof window !== 'undefined' ? decodeShare(window.location.hash) : null;

  const [pin, setPin] = useState<Pin>(
    shared?.solverId ? { solverId: shared.solverId, methodId: shared.methodId ?? '' } : null,
  );
  const [solverId, setSolverId] = useState(shared?.solverId ?? solvers[0].id);
  const [methodId, setMethodId] = useState(
    shared?.methodId ?? getSolver(shared?.solverId ?? '')?.defaultMethodId ?? solvers[0].defaultMethodId,
  );
  const [input, setInput] = useState(shared?.input ?? '');
  const [worked, setWorked] = useState<Worked | null>(null);
  const [detected, setDetected] = useState<Solver | null>(null);
  /** The canonical rewrite of what was typed, shown when it differs. */
  const [reading, setReading] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [comparing, setComparing] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasSolved = useRef(false);

  /**
   * Work the question. With no pin the engine detects the topic itself and may
   * split the question across the topics it spans; a pin says "this topic,
   * this method", which also means there is nothing to go looking for.
   */
  const solveWith = useCallback((value: string, pinned: Pin) => {
    if (value.trim() === '') {
      setWorked(null);
      hasSolved.current = false;
      return;
    }
    const solver = pinned ? getSolver(pinned.solverId) : undefined;
    setWorked(
      runWorked(
        value,
        solver ? { solver, methodId: pinned!.methodId || solver.defaultMethodId } : undefined,
      ),
    );
    hasSolved.current = true;
  }, []);

  /** Solving is the moment worth recording and worth making shareable. */
  const commit = useCallback(
    (value: string, pinned: Pin) => {
      solveWith(value, pinned);
      if (value.trim() === '') return;
      const sid = pinned?.solverId ?? solverId;
      const mid = pinned?.methodId ?? methodId;
      setHistory(pushHistory({ input: value, solverId: sid, methodId: mid, at: Date.now() }));
      window.history.replaceState(null, '', encodeShare({ input: value, solverId: sid, methodId: mid }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solveWith, solverId, methodId],
  );

  // Restore a shared link on first load.
  useEffect(() => {
    if (shared?.input) solveWith(shared.input, pin);
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
      const pinned: Pin = next.solverId
        ? { solverId: next.solverId, methodId: next.methodId ?? '' }
        : null;
      if (pinned) {
        setSolverId(pinned.solverId);
        setMethodId(pinned.methodId || getSolver(pinned.solverId)?.defaultMethodId || methodId);
      }
      setPin(pinned);
      setInput(next.input);
      solveWith(next.input, pinned);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodId, solveWith]);

  /**
   * The topic always follows what the student types. Detection only changes
   * the method when it lands on a different topic, so a method chosen for the
   * current question survives further edits to it.
   */
  useEffect(() => {
    const { detection, text, rewritten } = interpret(input);
    // Show the rewrite whenever plain English was turned into maths, so the
    // student can see exactly what was understood — and correct it if wrong.
    setReading(rewritten && input.trim() !== '' ? text : null);
    setDetected(detection?.solver ?? null);
    if (detection && detection.solver.id !== solverId) {
      setSolverId(detection.solver.id);
      setMethodId(detection.solver.defaultMethodId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // Once there's working on screen, keep it in step with further edits.
  useEffect(() => {
    if (hasSolved.current) solveWith(input, pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, pin]);

  /**
   * Choosing a method is a decision about *this* question, so it pins the
   * topic too — otherwise re-detection on the next keystroke would reset it.
   *
   * Switching to or from a structured-input method (see StructuredInputForm)
   * clears the question instead of re-solving it: the free text and a
   * form's serialized string are different vocabularies, so re-solving old
   * text under the new method's grammar would just fail with a parse error
   * that has nothing to do with what the student is about to fill in.
   */
  function chooseMethod(id: string) {
    const prevMethod = solver.methods.find((m) => m.id === methodId);
    const nextMethod = solver.methods.find((m) => m.id === id);
    setMethodId(id);
    setPin({ solverId, methodId: id });
    if (prevMethod?.fields || nextMethod?.fields) {
      setInput('');
      setWorked(null);
      hasSolved.current = false;
    }
  }

  function loadImported(solverIdIn: string, methodIdIn: string, value: string) {
    const pinned: Pin = { solverId: solverIdIn, methodId: methodIdIn };
    setSolverId(solverIdIn);
    setMethodId(methodIdIn);
    setPin(pinned);
    setInput(value);
    commit(value, pinned);
    onSidebarClose();
  }

  function loadHistoryEntry(h: HistoryEntry) {
    loadImported(h.solverId, h.methodId, h.input);
  }

  /**
   * A calculator picked from the sidebar directory lands on its form empty,
   * same as switching to a structured method mid-question (see chooseMethod):
   * there is nothing to solve yet, so this clears rather than re-solves.
   */
  function jumpToCalculator(solverIdIn: string, methodIdIn: string) {
    setSolverId(solverIdIn);
    setMethodId(methodIdIn);
    setPin({ solverId: solverIdIn, methodId: methodIdIn });
    setInput('');
    setWorked(null);
    hasSolved.current = false;
    onSidebarClose();
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

  const solver = getSolver(solverId)!;
  const activeMethod = solver.methods.find((m) => m.id === methodId);
  // A method better filled in than typed (a handful of named values rather
  // than one free-text expression) — see StructuredInputForm.
  const structuredMethod = activeMethod?.fields ? activeMethod : null;
  // Only say we cannot read it when nothing has been worked out either —
  // otherwise a solved question could show its topic and "not sure what this
  // is" at the same time.
  const unknown = input.trim() !== '' && !detected && !pin && !worked?.parts.length;
  // One part is the ordinary case; the single-solution view and the method
  // comparison both speak in terms of it.
  const single = worked && worked.parts.length === 1 ? worked.parts[0] : null;
  // Prefer what the question turned out to be over what was guessed live.
  const topics = worked
    ? [...new Set(worked.parts.map((p) => p.solver.title))]
    : detected
      ? [detected.title]
      : [];

  return (
    <>
      {sidebarOpen && (
        <Sidebar
          onClose={onSidebarClose}
          solver={solver}
          onLoadImported={(p) =>
            loadImported(p.solverId, p.methodId ?? getSolver(p.solverId)!.defaultMethodId, p.input)
          }
          history={history}
          onLoadHistory={loadHistoryEntry}
          onClearHistory={() => setHistory(clearHistory())}
          onJumpToCalculator={jumpToCalculator}
          theme={theme}
          onTheme={onTheme}
          revealMode={revealMode}
          onRevealMode={onRevealMode}
          dark={dark}
          onDark={onDark}
          textSize={textSize}
          onTextSize={onTextSize}
        />
      )}
      <main className="worksheet">
      <aside className="controls">
        <section className="panel">
          {structuredMethod ? (
            <StructuredInputForm
              // Remount whenever the field *set* changes (not on every
              // method switch) — see StructuredInputForm's own doc comment
              // for why an effect-based reset isn't safe here.
              key={structuredMethod.fields!.map((f) => f.id).join('|')}
              method={structuredMethod}
              onSubmit={(serialized) => {
                setInput(serialized);
                commit(serialized, pin);
              }}
            />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commit(input, pin);
              }}
            >
              <ProblemInput
                value={input}
                onChange={(v) => {
                  // A new question is a new question: stop forcing the topic and
                  // method that were chosen for the last one.
                  setInput(v);
                  setPin(null);
                }}
                placeholder="Ask in plain English — “area of a circle with radius 5”"
                preview={reading}
              />

              {reading && (
                <p className="reading" role="status">
                  <span className="reading-label">Read as</span>
                  <code className="reading-text">{reading}</code>
                </p>
              )}

              {/* Name the topics and nothing else. Once a question has been
                  worked, use what it actually turned out to be: live detection
                  only ever sees one topic, so on a split question it would name
                  whichever half it liked best. */}
              {topics.length > 0 && (
                <p className="detected" role="status">
                  <span className="detected-dot" aria-hidden="true" />
                  <strong>{topics.join(' → ')}</strong>
                </p>
              )}
              {unknown && (
                <p className="detected detected-unknown" role="status">
                  Not sure what this one is yet — try rewording it.
                </p>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{ marginTop: 'var(--sp-4)' }}
                disabled={input.trim() === '' || (!detected && !pin)}
              >
                Show the working
              </button>
            </form>
          )}
        </section>
      </aside>

      <section className="solution" aria-live="polite">
        {worked && worked.parts.length > 0 && (
          <button
            type="button"
            className="notes-toggle"
            aria-pressed={showNotes}
            onClick={() => onShowNotes(!showNotes)}
            title={showNotes ? 'Hide the reason for each line' : 'Show why each line follows from the one above'}
          >
            {showNotes ? 'Hide why' : 'Why?'}
          </button>
        )}
        {comparing && single?.result.ok ? (
          <>
            <header className="solution-head">
              <div>
                <div className="solution-title">
                  <RichText text={single.result.solution.headline} />
                </div>
                <div className="solution-sub">
                  Comparing all <em>{single.solver.methods.length}</em> methods
                </div>
              </div>
              <div className="solution-tools">
                <button type="button" className="btn" onClick={() => setComparing(false)}>
                  Back to one method
                </button>
              </div>
            </header>
            <CompareMethods solver={single.solver} input={single.text} />
          </>
        ) : worked && worked.parts.length > 1 ? (
          <PartedSolution
            worked={worked}
            revealMode={revealMode}
            showNotes={showNotes}
            onFocusPart={(part) =>
              // Working one part alone is how a student gets the method
              // choices and the comparison for just that topic.
              loadImported(part.solver.id, part.methodId, part.text)
            }
          />
        ) : (
          <SolutionView
            result={single?.result ?? null}
            revealMode={revealMode}
            showNotes={showNotes}
            canCompare={!!single?.result.ok && hasMethodChoice(single.solver, single.text)}
            onCompare={() => setComparing(true)}
            onCopyLink={copyLink}
            copied={copied}
            solverId={solverId}
            input={input}
            methodId={methodId}
            onSelectMethod={chooseMethod}
          />
        )}
      </section>
      </main>
    </>
  );
}

function SolutionView({
  result,
  revealMode,
  showNotes,
  canCompare,
  onCompare,
  onCopyLink,
  copied,
  solverId,
  input,
  methodId,
  onSelectMethod,
}: {
  result: SolveResult | null;
  revealMode: RevealMode;
  showNotes: boolean;
  canCompare: boolean;
  onCompare: () => void;
  onCopyLink: () => void;
  copied: boolean;
  solverId: string;
  input: string;
  methodId: string;
  onSelectMethod: (id: string) => void;
}) {
  const solver = getSolver(solverId)!;
  // A structured method (see StructuredInputForm) is chosen from its tab
  // before there's anything to solve, so — unlike the free-text case below —
  // its tabs and prompt have to render without a result to key off. Only
  // topics that actually offer one need this: everywhere else, the method
  // picker stays exactly where it's always been, alongside solved working.
  const hasStructuredMethod = solver.methods.some((m) => m.fields);
  const structured = !!solver.methods.find((m) => m.id === methodId)?.fields;

  const methodPicker = solver.methods.length > 1 && (
    <div className="solution-methods">
      <TopicMethodPicker
        solverId={solverId}
        input={input}
        methodId={methodId}
        onSelectMethod={onSelectMethod}
        forceAll={hasStructuredMethod}
      />
    </div>
  );

  if (structured) {
    return (
      <div>
        {result?.ok && (
          <header className="solution-head">
            <div>
              <div className="solution-title">
                <RichText text={result.solution.headline} />
              </div>
            </div>
            {result.solution.answerLatex && (
              <div className="answer-card">
                <span className="answer-label">Answer</span>
                <span className="answer-value">
                  <TeX tex={result.solution.answerLatex} />
                </span>
              </div>
            )}
          </header>
        )}
        {methodPicker}
        {result?.ok ? (
          <StepList
            solution={result.solution}
            revealMode={revealMode}
            showNotes={showNotes}
            canCompare={canCompare}
            onCompare={onCompare}
            onCopyLink={onCopyLink}
            copied={copied}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-glyph">∴</div>
            <h2>Fill in the values on the left</h2>
            <p>{result && !result.ok ? result.error : 'Once every field has a number, press “Show the working”.'}</p>
          </div>
        )}
      </div>
    );
  }

  if (!result) {
    return (
      <div>
        {hasStructuredMethod && methodPicker}
        <div className="empty-state">
          <div className="empty-glyph">∴</div>
          <h2>Your working will appear here</h2>
          <p>
            Type your problem and Longhand works out what topic it is, then shows every line —
            worked out exactly, using the method you were taught.
          </p>
        </div>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div>
        {hasStructuredMethod && methodPicker}
        <div className="empty-state">
          <div className="empty-glyph">≠</div>
          <h2>I couldn’t read that one</h2>
          <p>{result.error}</p>
        </div>
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

      {methodPicker}

      <StepList
        solution={solution}
        revealMode={revealMode}
        showNotes={showNotes}
        canCompare={canCompare}
        onCompare={onCompare}
        onCopyLink={onCopyLink}
        copied={copied}
      />
    </div>
  );
}
