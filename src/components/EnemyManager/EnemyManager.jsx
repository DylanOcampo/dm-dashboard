import { useApp } from '../../context/AppContext';
import './EnemyManager.css';

export default function EnemyManager() {
  const { enemies, addEnemy, updateEnemy, removeEnemy, t } = useApp();

  return (
    <section className="enemy-manager">
      <header className="enemy-manager__header">
        <h2>{t('enemies.title')}</h2>
        <button type="button" onClick={addEnemy}>
          {t('enemies.addButton')}
        </button>
      </header>

      {enemies.length === 0 && <p className="enemy-manager__empty">{t('enemies.emptyList')}</p>}

      <ul className="enemy-manager__list">
        {enemies.map((enemy) => (
          <li key={enemy.id} className="enemy-manager__row">
            <div className="enemy-manager__main">
              <input
                type="color"
                className="enemy-manager__color"
                value={enemy.color}
                onChange={(e) => updateEnemy(enemy.id, { color: e.target.value })}
                aria-label={t('enemies.colorAria', { name: enemy.name })}
              />
              <input
                type="text"
                className="enemy-manager__name"
                value={enemy.name}
                onChange={(e) => updateEnemy(enemy.id, { name: e.target.value })}
                placeholder={t('enemies.namePlaceholder')}
              />
              <label className="enemy-manager__stat">
                {t('enemies.acLabel')}
                <input
                  type="number"
                  min="0"
                  value={enemy.ac}
                  onChange={(e) => updateEnemy(enemy.id, { ac: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="enemy-manager__stat">
                {t('enemies.hpLabel')}
                <input
                  type="number"
                  min="1"
                  value={enemy.hpMax}
                  onChange={(e) => updateEnemy(enemy.id, { hpMax: Math.max(1, Number(e.target.value) || 1) })}
                />
              </label>
              <label className="enemy-manager__stat enemy-manager__stat--speed">
                {t('enemies.speedLabel')}
                <input
                  type="text"
                  value={enemy.speed}
                  onChange={(e) => updateEnemy(enemy.id, { speed: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="enemy-manager__remove"
                onClick={() => removeEnemy(enemy.id)}
                aria-label={t('enemies.removeAria', { name: enemy.name })}
              >
                {t('enemies.removeButton')}
              </button>
            </div>
            <textarea
              className="enemy-manager__attacks"
              value={enemy.attacks}
              onChange={(e) => updateEnemy(enemy.id, { attacks: e.target.value })}
              placeholder={t('enemies.attacksPlaceholder')}
              rows={2}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
