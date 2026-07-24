import { useApp } from '../../context/AppContext';
import './EnemyManager.css';

export default function EnemyManager() {
  const { enemies, addEnemy, updateEnemy, removeEnemy } = useApp();

  return (
    <section className="enemy-manager">
      <header className="enemy-manager__header">
        <h2>Enemigos</h2>
        <button type="button" onClick={addEnemy}>
          + Agregar enemigo
        </button>
      </header>

      {enemies.length === 0 && <p className="enemy-manager__empty">Aún no has agregado enemigos.</p>}

      <ul className="enemy-manager__list">
        {enemies.map((enemy) => (
          <li key={enemy.id} className="enemy-manager__row">
            <div className="enemy-manager__main">
              <input
                type="color"
                className="enemy-manager__color"
                value={enemy.color}
                onChange={(e) => updateEnemy(enemy.id, { color: e.target.value })}
                aria-label={`Color de ${enemy.name}`}
              />
              <input
                type="text"
                className="enemy-manager__name"
                value={enemy.name}
                onChange={(e) => updateEnemy(enemy.id, { name: e.target.value })}
                placeholder="Nombre del enemigo"
              />
              <label className="enemy-manager__stat">
                AC
                <input
                  type="number"
                  min="0"
                  value={enemy.ac}
                  onChange={(e) => updateEnemy(enemy.id, { ac: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="enemy-manager__stat">
                PG
                <input
                  type="number"
                  min="1"
                  value={enemy.hpMax}
                  onChange={(e) => updateEnemy(enemy.id, { hpMax: Math.max(1, Number(e.target.value) || 1) })}
                />
              </label>
              <label className="enemy-manager__stat enemy-manager__stat--speed">
                Vel.
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
                aria-label={`Eliminar a ${enemy.name}`}
              >
                Eliminar
              </button>
            </div>
            <textarea
              className="enemy-manager__attacks"
              value={enemy.attacks}
              onChange={(e) => updateEnemy(enemy.id, { attacks: e.target.value })}
              placeholder="Ataques / habilidades..."
              rows={2}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
