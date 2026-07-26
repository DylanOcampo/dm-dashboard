import { useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import './SaveThrowTracker.css';

function Pips({ count, total = 3 }) {
  return (
    <span className="save-throw-tracker__pips">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`save-throw-tracker__pip ${i < count ? 'is-filled' : ''}`} />
      ))}
    </span>
  );
}

export default function SaveThrowTracker({ instanceId }) {
  const { dashboardLayout, getCombat, recordDeathSave, resetDeathSaves, syncOptions, t } = useApp();
  const [config, setConfig] = usePersistedState(
    `saveThrowTracker:${instanceId}`,
    { linkedInstanceId: null },
    syncOptions
  );

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
      <div className="save-throw-tracker">
        <p className="save-throw-tracker__empty">{t('saveThrowTracker.emptyNoInitiative')}</p>
      </div>
    );
  }

  const linkedId = config.linkedInstanceId;
  const { combatants } = linkedId ? getCombat(linkedId) : { combatants: [] };
  const downed = combatants.filter(
    (c) => (c.type === 'player' || c.type === 'npc') && c.hp && c.hp.current <= 0
  );

  return (
    <div className="save-throw-tracker">
      {initiativeInstances.length > 1 && (
        <div className="save-throw-tracker__linker">
          <label>
            {t('conditionTracker.linkedLabel')}
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

      <p className="save-throw-tracker__hint">{t('saveThrowTracker.hint')}</p>

      <ul className="save-throw-tracker__list">
        {downed.length === 0 && <li className="save-throw-tracker__empty">{t('saveThrowTracker.emptyNoDowned')}</li>}
        {downed.map((combatant) => {
          const saves = combatant.deathSaves || { successes: 0, failures: 0 };
          return (
            <li
              key={combatant.id}
              className="save-throw-tracker__row"
              style={{ borderLeftColor: combatant.color }}
            >
              <span className="save-throw-tracker__name">{combatant.name}</span>

              {combatant.isDead ? (
                <div className="save-throw-tracker__dead">
                  <span>{t('saveThrowTracker.deadLabel')}</span>
                  <button type="button" onClick={() => resetDeathSaves(linkedId, combatant.id)}>
                    {t('saveThrowTracker.resetButton')}
                  </button>
                </div>
              ) : (
                <div className="save-throw-tracker__saves">
                  <div className="save-throw-tracker__save-row">
                    <span className="save-throw-tracker__save-label is-success">
                      {t('saveThrowTracker.successLabel')}
                    </span>
                    <Pips count={saves.successes} />
                    <button
                      type="button"
                      className="save-throw-tracker__save-btn is-success"
                      onClick={() => recordDeathSave(linkedId, combatant.id, 'successes')}
                    >
                      {t('saveThrowTracker.addSuccessButton')}
                    </button>
                  </div>
                  <div className="save-throw-tracker__save-row">
                    <span className="save-throw-tracker__save-label is-failure">
                      {t('saveThrowTracker.failureLabel')}
                    </span>
                    <Pips count={saves.failures} />
                    <button
                      type="button"
                      className="save-throw-tracker__save-btn is-failure"
                      onClick={() => recordDeathSave(linkedId, combatant.id, 'failures')}
                    >
                      {t('saveThrowTracker.addFailureButton')}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
