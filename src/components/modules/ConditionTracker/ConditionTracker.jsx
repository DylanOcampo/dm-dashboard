import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import { CONDITION_TYPES } from '../../../data/conditions';
import './ConditionTracker.css';

export default function ConditionTracker({ instanceId }) {
  const { dashboardLayout, getCombat, updateCombatants, syncOptions, t } = useApp();
  const [config, setConfig] = usePersistedState(
    `conditionTracker:${instanceId}`,
    { linkedInstanceId: null },
    syncOptions
  );
  const [selectedTypeByRow, setSelectedTypeByRow] = useState({});
  const [durationByRow, setDurationByRow] = useState({});

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
      <div className="condition-tracker">
        <p className="condition-tracker__empty">{t('conditionTracker.emptyNoInitiative')}</p>
      </div>
    );
  }

  const linkedId = config.linkedInstanceId;
  const { combatants } = linkedId ? getCombat(linkedId) : { combatants: [] };

  const addCondition = (combatantId) => {
    const type = selectedTypeByRow[combatantId] || CONDITION_TYPES[0].id;
    const duration = Math.max(1, Number(durationByRow[combatantId]) || 1);
    updateCombatants(linkedId, (prev) =>
      prev.map((c) =>
        c.id === combatantId
          ? { ...c, conditions: [...(c.conditions || []), { id: uuid(), type, remainingRounds: duration }] }
          : c
      )
    );
  };

  const removeCondition = (combatantId, conditionId) => {
    updateCombatants(linkedId, (prev) =>
      prev.map((c) =>
        c.id === combatantId
          ? { ...c, conditions: (c.conditions || []).filter((cond) => cond.id !== conditionId) }
          : c
      )
    );
  };

  const removeCombatant = (combatantId) => {
    updateCombatants(linkedId, (prev) => prev.filter((c) => c.id !== combatantId));
  };

  return (
    <div className="condition-tracker">
      {initiativeInstances.length > 1 && (
        <div className="condition-tracker__linker">
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

      <p className="condition-tracker__hint">{t('conditionTracker.hint')}</p>

      <ul className="condition-tracker__list">
        {combatants.length === 0 && (
          <li className="condition-tracker__empty">{t('conditionTracker.emptyNoCombatants')}</li>
        )}
        {combatants.map((combatant) => (
          <li key={combatant.id} className="condition-tracker__row" style={{ borderLeftColor: combatant.color }}>
            <div className="condition-tracker__row-header">
              <div className="condition-tracker__name-row">
                <span className="condition-tracker__name">{combatant.name}</span>
                <button
                  type="button"
                  className="condition-tracker__remove-combatant"
                  onClick={() => removeCombatant(combatant.id)}
                  aria-label={t('conditionTracker.removeCombatantAria', { name: combatant.name })}
                >
                  ×
                </button>
              </div>
              <div className="condition-tracker__badges">
                {(combatant.conditions || []).map((cond) => {
                  const meta = CONDITION_TYPES.find((ty) => ty.id === cond.type);
                  const label = t(`conditions.${cond.type}`);
                  return (
                    <span key={cond.id} className="condition-tracker__badge">
                      {meta?.emoji} {label} ({cond.remainingRounds})
                      <button
                        type="button"
                        onClick={() => removeCondition(combatant.id, cond.id)}
                        aria-label={t('conditionTracker.removeConditionAria', { condition: label, name: combatant.name })}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="condition-tracker__add-form">
              <select
                value={selectedTypeByRow[combatant.id] || CONDITION_TYPES[0].id}
                onChange={(e) => setSelectedTypeByRow((prev) => ({ ...prev, [combatant.id]: e.target.value }))}
              >
                {CONDITION_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.emoji} {t(`conditions.${type.id}`)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                title={t('conditionTracker.durationTitle')}
                value={durationByRow[combatant.id] ?? 1}
                onChange={(e) => setDurationByRow((prev) => ({ ...prev, [combatant.id]: e.target.value }))}
              />
              <button type="button" onClick={() => addCondition(combatant.id)}>
                {t('conditionTracker.addButton')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
