import { useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import { CONDITION_BY_ID } from '../../../data/conditions';
import './MonsterReference.css';

export default function MonsterReference({ instanceId }) {
  const {
    dashboardLayout,
    enemies,
    addEnemy,
    updateEnemy,
    removeEnemy,
    addEnemyToCombat,
    getCombat,
    syncOptions,
  } = useApp();
  const [config, setConfig] = usePersistedState(
    `monsterReference:${instanceId}`,
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

  const linkedId = config.linkedInstanceId;
  const { combatants } = linkedId ? getCombat(linkedId) : { combatants: [] };

  return (
    <div className="monster-reference">
      <div className="monster-reference__toolbar">
        <button type="button" onClick={addEnemy}>
          + Enemigo
        </button>
        {initiativeInstances.length > 1 && (
          <label className="monster-reference__linker">
            Tracker:
            <select
              value={linkedId ?? ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, linkedInstanceId: e.target.value }))}
            >
              {initiativeInstances.map((it, idx) => (
                <option key={it.i} value={it.i}>
                  Tracker de Iniciativa {idx + 1}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {initiativeInstances.length === 0 && (
        <p className="monster-reference__hint">
          Agrega un módulo "Tracker de Iniciativa" para poder enviar enemigos al combate.
        </p>
      )}

      {enemies.length === 0 && (
        <p className="monster-reference__empty">
          Sin enemigos guardados. Agrégalos aquí o en la sección "Enemigos".
        </p>
      )}

      <ul className="monster-reference__list">
        {enemies.map((enemy) => {
          const liveInstances = combatants.filter((c) => c.sourceEnemyId === enemy.id);
          return (
            <li key={enemy.id} className="monster-reference__card" style={{ borderLeftColor: enemy.color }}>
              <div className="monster-reference__row">
                <input
                  type="text"
                  className="monster-reference__name"
                  value={enemy.name}
                  onChange={(e) => updateEnemy(enemy.id, { name: e.target.value })}
                  placeholder="Nombre"
                />
                <label className="monster-reference__stat">
                  AC
                  <input
                    type="number"
                    min="0"
                    value={enemy.ac}
                    onChange={(e) => updateEnemy(enemy.id, { ac: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="monster-reference__stat">
                  PG
                  <input
                    type="number"
                    min="1"
                    value={enemy.hpMax}
                    onChange={(e) => updateEnemy(enemy.id, { hpMax: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </label>
                <label className="monster-reference__stat monster-reference__stat--speed">
                  Vel.
                  <input
                    type="text"
                    value={enemy.speed}
                    onChange={(e) => updateEnemy(enemy.id, { speed: e.target.value })}
                  />
                </label>
              </div>
              <textarea
                className="monster-reference__attacks"
                value={enemy.attacks}
                onChange={(e) => updateEnemy(enemy.id, { attacks: e.target.value })}
                placeholder="Ataques / habilidades..."
                rows={2}
              />

              {liveInstances.length > 0 && (
                <ul className="monster-reference__live-list">
                  {liveInstances.map((instance) => (
                    <li key={instance.id} className="monster-reference__live-item">
                      <span className="monster-reference__live-name">⚔ {instance.name}</span>
                      {instance.hp && (
                        <span className={instance.hp.current <= 0 ? 'is-down' : ''}>
                          ❤ {instance.hp.current}/{instance.hp.max}
                        </span>
                      )}
                      {instance.conditions?.map((cond) => (
                        <span key={cond.id} className="monster-reference__live-condition">
                          {CONDITION_BY_ID[cond.type]?.emoji ?? '❓'}
                          {cond.remainingRounds}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              )}

              <div className="monster-reference__actions">
                <button
                  type="button"
                  className="monster-reference__add-to-combat"
                  onClick={() => linkedId && addEnemyToCombat(linkedId, enemy)}
                  disabled={!linkedId}
                >
                  + Combate
                </button>
                <button
                  type="button"
                  className="monster-reference__remove"
                  onClick={() => removeEnemy(enemy.id)}
                  aria-label={`Eliminar ${enemy.name}`}
                >
                  Eliminar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
