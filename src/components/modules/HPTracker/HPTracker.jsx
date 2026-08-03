import { useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import './HPTracker.css';

const DEFAULT_HP = { current: 10, max: 10 };

export default function HPTracker({ instanceId }) {
  const { dashboardLayout, getCombat, updateCombatants, syncOptions, t } = useApp();
  const [config, setConfig] = usePersistedState(`hpTracker:${instanceId}`, { linkedInstanceId: null }, syncOptions);

  const initiativeInstances = dashboardLayout.filter((item) => (item.type || item.i) === 'initiative');
  const initiativeIds = initiativeInstances.map((it) => it.i).join(',');

  useEffect(() => {
    if (initiativeInstances.length === 0) return;
    const stillExists = initiativeInstances.some((it) => it.i === config.linkedInstanceId);
    if (!config.linkedInstanceId || !stillExists) {
      setConfig((prev) => ({ ...prev, linkedInstanceId: initiativeInstances[0].i }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initiativeIds, config.linkedInstanceId]);

  if (initiativeInstances.length === 0) {
    return (
      <div className="hp-tracker">
        <p className="hp-tracker__empty">{t('hpTracker.emptyNoInitiative')}</p>
      </div>
    );
  }

  const linkedId = config.linkedInstanceId;
  const { combatants } = linkedId ? getCombat(linkedId) : { combatants: [] };

  const applyDelta = (combatantId, delta) => {
    updateCombatants(linkedId, (prev) =>
      prev.map((c) => {
        if (c.id !== combatantId) return c;
        const hp = c.hp || DEFAULT_HP;
        const current = Math.max(0, Math.min(hp.current + delta, hp.max));
        return { ...c, hp: { ...hp, current } };
      })
    );
  };

  const setCurrent = (combatantId, value) => {
    updateCombatants(linkedId, (prev) =>
      prev.map((c) => {
        if (c.id !== combatantId) return c;
        const hp = c.hp || DEFAULT_HP;
        const current = Math.max(0, Math.min(Number(value) || 0, hp.max));
        return { ...c, hp: { ...hp, current } };
      })
    );
  };

  const setMax = (combatantId, value) => {
    updateCombatants(linkedId, (prev) =>
      prev.map((c) => {
        if (c.id !== combatantId) return c;
        const hp = c.hp || DEFAULT_HP;
        const max = Math.max(1, Number(value) || 1);
        return { ...c, hp: { current: Math.min(hp.current, max), max } };
      })
    );
  };

  const removeCombatant = (combatantId) => {
    updateCombatants(linkedId, (prev) => prev.filter((c) => c.id !== combatantId));
  };

  return (
    <div className="hp-tracker">
      {initiativeInstances.length > 1 && (
        <div className="hp-tracker__linker">
          <label>
            {t('hpTracker.linkedLabel')}
            <select
              value={linkedId ?? ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, linkedInstanceId: e.target.value }))}
            >
              {initiativeInstances.map((it, idx) => (
                <option key={it.i} value={it.i}>
                  {t('conditionTracker.trackerOption', { n: idx + 1 })}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <ul className="hp-tracker__list">
        {combatants.length === 0 && <li className="hp-tracker__empty">{t('hpTracker.emptyNoCombatants')}</li>}
        {combatants.map((combatant) => {
          const hp = combatant.hp || DEFAULT_HP;
          const pct = Math.max(0, Math.min(100, (hp.current / hp.max) * 100));
          const isDown = hp.current <= 0;
          return (
            <li key={combatant.id} className="hp-tracker__row" style={{ borderLeftColor: combatant.color }}>
              <div className="hp-tracker__row-header">
                {combatant.image ? (
                  <img src={combatant.image} alt={combatant.name} className="hp-tracker__combatant-image" />
                ) : (
                  <div className="hp-tracker__combatant-image-placeholder" style={{ background: combatant.color }}>
                    {combatant.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hp-tracker__name">{combatant.name}</span>
                <span className={`hp-tracker__value ${isDown ? 'is-down' : ''}`}>
                  {hp.current} / {hp.max}
                </span>
                <button
                  type="button"
                  className="hp-tracker__remove"
                  onClick={() => removeCombatant(combatant.id)}
                  aria-label={t('hpTracker.removeAria', { name: combatant.name })}
                >
                  ×
                </button>
              </div>
              <input
                type="range"
                className={`hp-tracker__slider ${isDown ? 'is-down' : ''}`}
                min="0"
                max={hp.max}
                value={hp.current}
                onChange={(e) => setCurrent(combatant.id, e.target.value)}
                style={{ '--hp-pct': `${pct}%` }}
                aria-label={t('hpTracker.hpSliderAria', { name: combatant.name })}
              />
              <div className="hp-tracker__controls">
                <button type="button" onClick={() => applyDelta(combatant.id, -5)}>
                  −5
                </button>
                <button type="button" onClick={() => applyDelta(combatant.id, -1)}>
                  −1
                </button>
                <input
                  type="number"
                  className="hp-tracker__current-input"
                  value={hp.current}
                  onChange={(e) => setCurrent(combatant.id, e.target.value)}
                />
                <button type="button" onClick={() => applyDelta(combatant.id, 1)}>
                  +1
                </button>
                <button type="button" onClick={() => applyDelta(combatant.id, 5)}>
                  +5
                </button>
                <label className="hp-tracker__max-label">
                  {t('hpTracker.maxLabel')}
                  <input
                    type="number"
                    min="1"
                    className="hp-tracker__max-input"
                    value={hp.max}
                    onChange={(e) => setMax(combatant.id, e.target.value)}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
