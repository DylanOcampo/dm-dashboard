import { useEffect, useRef, useState } from 'react';
import './TimeModule.css';

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(totalMs) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function ClockView() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="time-module__display">
      <span className="time-module__value">{formatClock(now)}</span>
      <span className="time-module__caption">
        {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>
    </div>
  );
}

function StopwatchView() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef(null);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 250);
    return () => clearInterval(id);
  }, [isRunning]);

  const start = () => {
    startedAtRef.current = Date.now() - elapsedMs;
    setIsRunning(true);
  };
  const pause = () => setIsRunning(false);
  const reset = () => {
    setIsRunning(false);
    setElapsedMs(0);
  };

  return (
    <div className="time-module__display">
      <span className="time-module__value">{formatDuration(elapsedMs)}</span>
      <div className="time-module__controls">
        {!isRunning ? (
          <button type="button" onClick={start}>Iniciar</button>
        ) : (
          <button type="button" onClick={pause}>Pausar</button>
        )}
        <button type="button" onClick={reset}>Reiniciar</button>
      </div>
    </div>
  );
}

function TimerView() {
  const [inputMinutes, setInputMinutes] = useState(5);
  const [remainingMs, setRemainingMs] = useState(5 * 60 * 1000);
  const [isRunning, setIsRunning] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => {
      const next = targetRef.current - Date.now();
      if (next <= 0) {
        setRemainingMs(0);
        setIsRunning(false);
      } else {
        setRemainingMs(next);
      }
    }, 250);
    return () => clearInterval(id);
  }, [isRunning]);

  const start = () => {
    const base = remainingMs > 0 ? remainingMs : inputMinutes * 60 * 1000;
    targetRef.current = Date.now() + base;
    setRemainingMs(base);
    setIsRunning(true);
  };
  const pause = () => setIsRunning(false);
  const reset = () => {
    setIsRunning(false);
    setRemainingMs(inputMinutes * 60 * 1000);
  };

  const finished = remainingMs <= 0;

  return (
    <div className="time-module__display">
      <span className={`time-module__value ${finished ? 'time-module__value--done' : ''}`}>
        {formatDuration(remainingMs)}
      </span>
      <div className="time-module__controls">
        <label className="time-module__minutes">
          Min
          <input
            type="number"
            min="1"
            value={inputMinutes}
            disabled={isRunning}
            onChange={(e) => {
              const val = Math.max(1, Number(e.target.value) || 1);
              setInputMinutes(val);
              if (!isRunning) setRemainingMs(val * 60 * 1000);
            }}
          />
        </label>
        {!isRunning ? (
          <button type="button" onClick={start}>Iniciar</button>
        ) : (
          <button type="button" onClick={pause}>Pausar</button>
        )}
        <button type="button" onClick={reset}>Reiniciar</button>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'clock', label: 'Hora', Component: ClockView },
  { id: 'stopwatch', label: 'Cronómetro', Component: StopwatchView },
  { id: 'timer', label: 'Temporizador', Component: TimerView },
];

export default function TimeModule() {
  const [activeTab, setActiveTab] = useState('clock');
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.Component ?? ClockView;

  return (
    <div className="time-module">
      <div className="time-module__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`time-module__tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ActiveComponent key={activeTab} />
    </div>
  );
}
