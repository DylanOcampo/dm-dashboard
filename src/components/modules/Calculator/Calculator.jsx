import { useState } from 'react';
import './Calculator.css';

function compute(a, b, operator) {
  switch (operator) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function formatResult(n) {
  if (Number.isNaN(n)) return 'Error';
  const rounded = Math.round(n * 1e10) / 1e10;
  return String(rounded);
}

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [overwrite, setOverwrite] = useState(true);

  const inputDigit = (digit) => {
    if (overwrite) {
      setDisplay(digit);
      setOverwrite(false);
    } else {
      setDisplay((prev) => (prev === '0' ? digit : prev + digit));
    }
  };

  const inputDecimal = () => {
    if (overwrite) {
      setDisplay('0.');
      setOverwrite(false);
      return;
    }
    setDisplay((prev) => (prev.includes('.') ? prev : `${prev}.`));
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setOverwrite(true);
  };

  const toggleSign = () => {
    setDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : prev === '0' ? prev : `-${prev}`));
  };

  const percent = () => {
    setDisplay((prev) => formatResult(parseFloat(prev) / 100));
  };

  const chooseOperator = (nextOperator) => {
    const current = parseFloat(display);
    if (operator && !overwrite) {
      const result = compute(previousValue, current, operator);
      setDisplay(formatResult(result));
      setPreviousValue(result);
    } else {
      setPreviousValue(current);
    }
    setOperator(nextOperator);
    setOverwrite(true);
  };

  const equals = () => {
    if (operator == null || previousValue == null) return;
    const current = parseFloat(display);
    const result = compute(previousValue, current, operator);
    setDisplay(formatResult(result));
    setPreviousValue(null);
    setOperator(null);
    setOverwrite(true);
  };

  return (
    <div className="calculator">
      <div className="calculator__display">{display}</div>
      <div className="calculator__pad">
        <button type="button" className="calculator__key calculator__key--fn" onClick={clear}>
          C
        </button>
        <button type="button" className="calculator__key calculator__key--fn" onClick={toggleSign}>
          ±
        </button>
        <button type="button" className="calculator__key calculator__key--fn" onClick={percent}>
          %
        </button>
        <button type="button" className="calculator__key calculator__key--op" onClick={() => chooseOperator('÷')}>
          ÷
        </button>

        <button type="button" className="calculator__key" onClick={() => inputDigit('7')}>
          7
        </button>
        <button type="button" className="calculator__key" onClick={() => inputDigit('8')}>
          8
        </button>
        <button type="button" className="calculator__key" onClick={() => inputDigit('9')}>
          9
        </button>
        <button type="button" className="calculator__key calculator__key--op" onClick={() => chooseOperator('×')}>
          ×
        </button>

        <button type="button" className="calculator__key" onClick={() => inputDigit('4')}>
          4
        </button>
        <button type="button" className="calculator__key" onClick={() => inputDigit('5')}>
          5
        </button>
        <button type="button" className="calculator__key" onClick={() => inputDigit('6')}>
          6
        </button>
        <button type="button" className="calculator__key calculator__key--op" onClick={() => chooseOperator('−')}>
          −
        </button>

        <button type="button" className="calculator__key" onClick={() => inputDigit('1')}>
          1
        </button>
        <button type="button" className="calculator__key" onClick={() => inputDigit('2')}>
          2
        </button>
        <button type="button" className="calculator__key" onClick={() => inputDigit('3')}>
          3
        </button>
        <button type="button" className="calculator__key calculator__key--op" onClick={() => chooseOperator('+')}>
          +
        </button>

        <button type="button" className="calculator__key calculator__key--zero" onClick={() => inputDigit('0')}>
          0
        </button>
        <button type="button" className="calculator__key" onClick={inputDecimal}>
          .
        </button>
        <button type="button" className="calculator__key calculator__key--equals" onClick={equals}>
          =
        </button>
      </div>
    </div>
  );
}
