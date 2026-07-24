import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import './TimeModule.css';

const LOCALE_BY_LANGUAGE = { es: 'es-ES', en: 'en-US' };

function formatClock(date, locale) {
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(totalMs) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function ClockView({ locale }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="time-module__display">
      <span className="time-module__value">{formatClock(now, locale)}</span>
      <span className="time-module__caption">
        {now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>
    </div>
  );
}

function StopwatchView({ t }) {
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
          <button type="button" onClick={start}>{t('time.start')}</button>
        ) : (
          <button type="button" onClick={pause}>{t('time.pause')}</button>
        )}
        <button type="button" onClick={reset}>{t('time.reset')}</button>
      </div>
    </div>
  );
}

function TimerView({ t }) {
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
          {t('time.minutes')}
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
          <button type="button" onClick={start}>{t('time.start')}</button>
        ) : (
          <button type="button" onClick={pause}>{t('time.pause')}</button>
        )}
        <button type="button" onClick={reset}>{t('time.reset')}</button>
      </div>
    </div>
  );
}

export default function TimeModule() {
  const { t, language } = useApp();
  const locale = LOCALE_BY_LANGUAGE[language] ?? undefined;
  const [activeTab, setActiveTab] = useState('clock');

  const TABS = [
    { id: 'clock', label: t('time.tabClock'), Component: ClockView },
    { id: 'stopwatch', label: t('time.tabStopwatch'), Component: StopwatchView },
    { id: 'timer', label: t('time.tabTimer'), Component: TimerView },
  ];

  const ActiveComponent = TABS.find((tab) => tab.id === activeTab)?.Component ?? ClockView;

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
      <ActiveComponent key={activeTab} t={t} locale={locale} />
    </div>
  );
}
