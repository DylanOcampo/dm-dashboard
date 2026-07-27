import { useApp } from '../../context/AppContext';
import AvatarInput from '../common/AvatarInput/AvatarInput';
import './NPCManager.css';

export default function NPCManager() {
  const { npcs, addNPC, updateNPC, removeNPC, t } = useApp();

  return (
    <section className="npc-manager">
      <header className="npc-manager__header">
        <h2>{t('npcs.title')}</h2>
        <button type="button" onClick={addNPC}>
          {t('npcs.addButton')}
        </button>
      </header>

      {npcs.length === 0 && <p className="npc-manager__empty">{t('npcs.emptyList')}</p>}

      <ul className="npc-manager__list">
        {npcs.map((npc) => (
          <li key={npc.id} className="npc-manager__row">
            <div className="npc-manager__main">
              <AvatarInput
                value={npc.avatar}
                onChange={(avatar) => updateNPC(npc.id, { avatar })}
                label={t('npcs.avatarLabel')}
              />
              <input
                type="color"
                className="npc-manager__color"
                value={npc.color}
                onChange={(e) => updateNPC(npc.id, { color: e.target.value })}
                aria-label={t('npcs.colorAria', { name: npc.name })}
              />
              <input
                type="text"
                className="npc-manager__name"
                value={npc.name}
                onChange={(e) => updateNPC(npc.id, { name: e.target.value })}
                placeholder={t('npcs.namePlaceholder')}
              />
              <label className="npc-manager__combat-toggle">
                <input
                  type="checkbox"
                  checked={npc.isCombat}
                  onChange={(e) => updateNPC(npc.id, { isCombat: e.target.checked })}
                />
                {t('npcs.isCombatLabel')}
              </label>
              <label className="npc-manager__reveal">
                <input
                  type="checkbox"
                  checked={Boolean(npc.revealed)}
                  onChange={(e) => updateNPC(npc.id, { revealed: e.target.checked })}
                />
                {t('npcs.revealedLabel')}
              </label>
              <button
                type="button"
                className="npc-manager__remove"
                onClick={() => removeNPC(npc.id)}
                aria-label={t('npcs.removeAria', { name: npc.name })}
              >
                {t('npcs.removeButton')}
              </button>
            </div>

            <textarea
              className="npc-manager__description"
              value={npc.description}
              onChange={(e) => updateNPC(npc.id, { description: e.target.value })}
              placeholder={t('npcs.descriptionPlaceholder')}
              rows={2}
            />

            {npc.isCombat && (
              <div className="npc-manager__combat-stats">
                <label className="npc-manager__stat">
                  {t('npcs.acLabel')}
                  <input
                    type="number"
                    min="0"
                    value={npc.ac}
                    onChange={(e) => updateNPC(npc.id, { ac: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="npc-manager__stat">
                  {t('npcs.hpLabel')}
                  <input
                    type="number"
                    min="1"
                    value={npc.hpMax}
                    onChange={(e) => updateNPC(npc.id, { hpMax: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </label>
                <label className="npc-manager__stat npc-manager__stat--speed">
                  {t('npcs.speedLabel')}
                  <input
                    type="text"
                    value={npc.speed}
                    onChange={(e) => updateNPC(npc.id, { speed: e.target.value })}
                  />
                </label>
                <input
                  type="text"
                  className="npc-manager__attacks"
                  value={npc.attacks}
                  onChange={(e) => updateNPC(npc.id, { attacks: e.target.value })}
                  placeholder={t('npcs.attacksPlaceholder')}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
