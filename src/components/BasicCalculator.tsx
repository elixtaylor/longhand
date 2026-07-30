import { useMemo, useState } from 'react';
import { evaluateExpr, parseExpr, type AngleMode } from '../lib/math/expr';

interface CalculatorKey {
  label: string;
  insert?: string;
  action?: 'clear' | 'backspace' | 'equals';
}

const FUNCTION_KEYS: CalculatorKey[] = [
  { label: 'sin', insert: 'sin(' },
  { label: 'cos', insert: 'cos(' },
  { label: 'tan', insert: 'tan(' },
  { label: '√', insert: 'sqrt(' },
  { label: 'sin⁻¹', insert: 'arcsin(' },
  { label: 'cos⁻¹', insert: 'arccos(' },
  { label: 'tan⁻¹', insert: 'arctan(' },
  { label: 'π', insert: 'π' },
];

const KEYS: CalculatorKey[] = [
  { label: 'C', action: 'clear' },
  { label: '⌫', action: 'backspace' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
  { label: '7', insert: '7' },
  { label: '8', insert: '8' },
  { label: '9', insert: '9' },
  { label: '×', insert: '*' },
  { label: '4', insert: '4' },
  { label: '5', insert: '5' },
  { label: '6', insert: '6' },
  { label: '÷', insert: '/' },
  { label: '1', insert: '1' },
  { label: '2', insert: '2' },
  { label: '3', insert: '3' },
  { label: '−', insert: '-' },
  { label: '0', insert: '0' },
  { label: '.', insert: '.' },
  { label: '+', insert: '+' },
  { label: '=', action: 'equals' },
];

function display(value: number): string {
  if (!Number.isFinite(value)) return 'undefined';
  if (Math.abs(value) < 1e-12) return '0';
  return String(Number(value.toPrecision(10)));
}

export function BasicCalculator({
  id,
  onClose,
}: {
  id?: string;
  onClose: () => void;
}) {
  const [expression, setExpression] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [angleMode, setAngleMode] = useState<AngleMode>('degrees');

  const liveAnswer = useMemo(() => {
    if (!expression.trim()) return null;
    try {
      const value = evaluateExpr(parseExpr(expression), {}, { angleMode });
      return Number.isFinite(value) ? display(value) : null;
    } catch {
      return null;
    }
  }, [angleMode, expression]);

  function press(key: CalculatorKey) {
    if (key.action === 'clear') {
      setExpression('');
      setAnswer(null);
      return;
    }
    if (key.action === 'backspace') {
      setExpression((value) => value.slice(0, -1));
      setAnswer(null);
      return;
    }
    if (key.action === 'equals') {
      setAnswer(liveAnswer);
      return;
    }
    setExpression((value) => `${value}${key.insert ?? ''}`);
    setAnswer(null);
  }

  return (
    <div
      className="basic-calculator"
      id={id}
      role="dialog"
      aria-label="Basic calculator"
    >
      <div className="basic-calculator-head">
        <strong>Simple calculator</strong>
        <button
          type="button"
          className="basic-calculator-close"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="basic-calculator-display">
        <input
          aria-label="Calculator expression"
          value={expression}
          onChange={(event) => {
            setExpression(event.target.value);
            setAnswer(null);
          }}
          placeholder="0"
          inputMode="decimal"
        />
        <output aria-label="Calculator result">
          {answer ?? liveAnswer ?? ' '}
        </output>
      </div>
      <div
        className="basic-calculator-mode"
        role="group"
        aria-label="Angle mode"
      >
        {(['degrees', 'radians'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={angleMode === mode}
            onClick={() => setAngleMode(mode)}
          >
            {mode === 'degrees' ? 'Degrees' : 'Radians'}
          </button>
        ))}
      </div>
      <div
        className="basic-calculator-functions"
        role="group"
        aria-label="Calculator functions"
      >
        {FUNCTION_KEYS.map((key) => (
          <button key={key.label} type="button" onClick={() => press(key)}>
            {key.label}
          </button>
        ))}
      </div>
      <div className="basic-calculator-keys">
        {KEYS.map((key) => (
          <button
            key={key.label}
            type="button"
            className={key.action === 'equals' ? 'basic-calculator-equals' : ''}
            onClick={() => press(key)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
