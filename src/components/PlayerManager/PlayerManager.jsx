import { useApp } from '../../context/AppContext';
import './PlayerManager.css';

export default function PlayerManager() {
  const { players, addPlayer, updatePlayer, removePlayer } = useApp();

  return (
    <section className="player-manager">
      <header className="player-manager__header">
        <h2>Jugadores</h2>
        <button type="button" onClick={addPlayer}>
          + Agregar jugador
        </button>
      </header>

      {players.length === 0 && <p className="player-manager__empty">Aún no has agregado jugadores.</p>}

      <ul className="player-manager__list">
        {players.map((player) => (
          <li key={player.id} className="player-manager__row">
            <input
              type="color"
              className="player-manager__color"
              value={player.color}
              onChange={(e) => updatePlayer(player.id, { color: e.target.value })}
              aria-label={`Color de ${player.name}`}
            />
            <input
              type="text"
              className="player-manager__name"
              value={player.name}
              onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
              placeholder="Nombre del jugador"
            />
            <label className="player-manager__level-label">
              Nivel
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
              aria-label={`Eliminar a ${player.name}`}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
