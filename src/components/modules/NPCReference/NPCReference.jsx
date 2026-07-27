import { useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import { CONDITION_BY_ID } from '../../../data/conditions';
import AvatarInput from '../../common/AvatarInput/AvatarInput';
import './NPCReference.css';

export default function NPCReference({ instanceId }) {
  const {
    dashboardLayout,
    npcs,
    addNPC,
    updateNPC,
    removeNPC,
    addNPCToCombat,
    getCombat,
    syncOptions,
    t,
  } = useApp();
  const [config, setConfig] = usePersistedState(`npcReference:${instanceId}`, { linkedInstanceId: null }, syncOptions);

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
    <div className="npc-reference">
      <div className="npc-reference__toolbar">
        <button type="button" onClick={addNPC}>
          {t('npcs.addButton')}
        </button>
        {initiativeInstances.length > 1 && (
          <label className="npc-reference__linker">
            {t('monsterReference.trackerLabel')}
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
        )}
      </div>

      {npcs.length === 0 && <p className="npc-reference__empty">{t('npcs.emptyList')}</p>}

      <ul className="npc-reference__list">
        {npcs.map((npc) => {
          const liveInstances = npc.isCombat ? combatants.filter((c) => c.sourceNpcId === npc.id) : [];
          return (
            <li key={npc.id} className="npc-reference__card" style={{ borderLeftColor: npc.color }}>
              <div className="npc-reference__row">
                <AvatarInput
                  value={npc.avatar}
                  onChange={(avatar) => updateNPC(npc.id, { avatar })}
                  label={t('npcs.avatarLabel')}
                />
                <input
                  type="text"
                  className="npc-reference__name"
                  value={npc.name}
                  onChange={(e) => updateNPC(npc.id, { name: e.target.value })}
                  placeholder={t('npcs.namePlaceholder')}
                />
                <label className="npc-reference__combat-toggle">
                  <input
                    type="checkbox"
                    checked={npc.isCombat}
                    onChange={(e) => updateNPC(npc.id, { isCombat: e.target.checked })}
                  />
                  {t('npcs.isCombatLabel')}
                </label>
                <label className="npc-reference__combat-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(npc.revealed)}
                    onChange={(e) => updateNPC(npc.id, { revealed: e.target.checked })}
                  />
                  {t('npcs.revealedLabel')}
                </label>
              </div>

              <textarea
                className="npc-reference__description"
                value={npc.description}
                onChange={(e) => updateNPC(npc.id, { description: e.target.value })}
                placeholder={t('npcs.descriptionPlaceholder')}
                rows={2}
              />

              {npc.isCombat && (
                <>
                  <div className="npc-reference__stats-row">
                    <label className="npc-reference__stat">
                      {t('npcs.acLabel')}
                      <input
                        type="number"
                        min="0"
                        value={npc.ac}
                        onChange={(e) => updateNPC(npc.id, { ac: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="npc-reference__stat">
                      {t('npcs.hpLabel')}
                      <input
                        type="number"
                        min="1"
                        value={npc.hpMax}
                        onChange={(e) => updateNPC(npc.id, { hpMax: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </label>
                    <label className="npc-reference__stat npc-reference__stat--speed">
                      {t('npcs.speedLabel')}
                      <input
                        type="text"
                        value={npc.speed}
                        onChange={(e) => updateNPC(npc.id, { speed: e.target.value })}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    className="npc-reference__attacks"
                    value={npc.attacks}
                    onChange={(e) => updateNPC(npc.id, { attacks: e.target.value })}
                    placeholder={t('npcs.attacksPlaceholder')}
                  />

                  {liveInstances.length > 0 && (
                    <ul className="npc-reference__live-list">
                      {liveInstances.map((instance) => (
                        <li key={instance.id} className="npc-reference__live-item">
                          <span className="npc-reference__live-name">⚔ {instance.name}</span>
                          {instance.hp && (
                            <span className={instance.hp.current <= 0 ? 'is-down' : ''}>
                              ❤ {instance.hp.current}/{instance.hp.max}
                            </span>
                          )}
                          {instance.conditions?.map((cond) => (
                            <span key={cond.id} className="npc-reference__live-condition">
                              {CONDITION_BY_ID[cond.type]?.emoji ?? '❓'}
                              {cond.remainingRounds}
                            </span>
                          ))}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <div className="npc-reference__actions">
                {npc.isCombat && (
                  <button
                    type="button"
                    className="npc-reference__add-to-combat"
                    onClick={() => linkedId && addNPCToCombat(linkedId, npc)}
                    disabled={!linkedId}
                  >
                    {t('monsterReference.addToCombatButton')}
                  </button>
                )}
                <button
                  type="button"
                  className="npc-reference__remove"
                  onClick={() => removeNPC(npc.id)}
                  aria-label={t('npcs.removeAria', { name: npc.name })}
                >
                  {t('npcs.removeButton')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
