import { v4 as uuid } from 'uuid';
import { useApp } from '../../context/AppContext';
import AvatarInput from '../common/AvatarInput/AvatarInput';
import './PlayerManager.css';

export default function PlayerManager() {
  const { players, addPlayer, updatePlayer, removePlayer, t } = useApp();

  const addCustomStat = (player) => {
    updatePlayer(player.id, {
      customStats: [...(player.customStats || []), { id: uuid(), label: '', value: '' }],
    });
  };

  const updateCustomStat = (player, statId, changes) => {
    updatePlayer(player.id, {
      customStats: (player.customStats || []).map((s) => (s.id === statId ? { ...s, ...changes } : s)),
    });
  };

  const removeCustomStat = (player, statId) => {
    updatePlayer(player.id, {
      customStats: (player.customStats || []).filter((s) => s.id !== statId),
    });
  };

  return (
    <section className="player-manager">
      <header className="player-manager__header">
        <h2>{t('players.title')}</h2>
        <button type="button" onClick={addPlayer}>
          {t('players.addButton')}
        </button>
      </header>

      {players.length === 0 && <p className="player-manager__empty">{t('players.emptyList')}</p>}

      <ul className="player-manager__list">
        {players.map((player) => (
          <li key={player.id} className="player-manager__row">
            <div className="player-manager__main">
              <AvatarInput
                value={player.avatar}
                onChange={(avatar) => updatePlayer(player.id, { avatar })}
                label={t('players.avatarLabel')}
              />
              <input
                type="color"
                className="player-manager__color"
                value={player.color}
                onChange={(e) => updatePlayer(player.id, { color: e.target.value })}
                aria-label={t('players.colorAria', { name: player.name })}
              />
              <input
                type="text"
                className="player-manager__name"
                value={player.name}
                onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                placeholder={t('players.namePlaceholder')}
              />
              <input
                type="text"
                className="player-manager__class"
                value={player.class || ''}
                onChange={(e) => updatePlayer(player.id, { class: e.target.value })}
                placeholder={t('players.classPlaceholder')}
              />
              <label className="player-manager__level-label">
                {t('players.levelLabel')}
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="player-manager__level"
                  value={player.level}
                  onChange={(e) => updatePlayer(player.id, { level: Math.max(1, Number(e.target.value) || 1) })}
                />
              </label>
              <button
                type="button"
                className="player-manager__remove"
                onClick={() => removePlayer(player.id)}
                aria-label={t('players.removeAria', { name: player.name })}
              >
                {t('players.removeButton')}
              </button>
            </div>

            <div className="player-manager__stats-row">
              <label className="player-manager__stat">
                {t('players.acLabel')}
                <input
                  type="number"
                  min="0"
                  value={player.ac ?? 10}
                  onChange={(e) => updatePlayer(player.id, { ac: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="player-manager__stat">
                {t('players.hpCurrentLabel')}
                <input
                  type="number"
                  min="0"
                  value={player.hp?.current ?? 10}
                  onChange={(e) =>
                    updatePlayer(player.id, {
                      hp: { ...(player.hp || { current: 10, max: 10 }), current: Number(e.target.value) || 0 },
                    })
                  }
                />
              </label>
              <label className="player-manager__stat">
                {t('players.hpMaxLabel')}
                <input
                  type="number"
                  min="1"
                  value={player.hp?.max ?? 10}
                  onChange={(e) =>
                    updatePlayer(player.id, {
                      hp: { ...(player.hp || { current: 10, max: 10 }), max: Math.max(1, Number(e.target.value) || 1) },
                    })
                  }
                />
              </label>
            </div>

            <div className="player-manager__custom-stats">
              {(player.customStats || []).map((stat) => (
                <div key={stat.id} className="player-manager__custom-stat">
                  <input
                    type="text"
                    className="player-manager__custom-stat-label"
                    value={stat.label}
                    onChange={(e) => updateCustomStat(player, stat.id, { label: e.target.value })}
                    placeholder={t('players.customStatLabelPlaceholder')}
                  />
                  <input
                    type="text"
                    className="player-manager__custom-stat-value"
                    value={stat.value}
                    onChange={(e) => updateCustomStat(player, stat.id, { value: e.target.value })}
                    placeholder={t('players.customStatValuePlaceholder')}
                  />
                  <button
                    type="button"
                    className="player-manager__custom-stat-remove"
                    onClick={() => removeCustomStat(player, stat.id)}
                    aria-label={t('players.removeCustomStatAria')}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="player-manager__add-stat" onClick={() => addCustomStat(player)}>
                {t('players.addCustomStatButton')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
