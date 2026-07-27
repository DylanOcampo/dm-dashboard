import { usePlayerSession } from '../PlayerSessionContext';
import './PlayerCombat.css';

export default function PlayerHPView() {
  const { liveCombat, identityId, t } = usePlayerSession();

  if (!liveCombat) {
    return <p className="player-combat__empty">{t('playerApp.waitingForCombat')}</p>;
  }

  const { combatants } = liveCombat;

  return (
    <ul className="player-combat__list">
      {combatants.length === 0 && <li className="player-combat__empty">{t('hpTracker.emptyNoCombatants')}</li>}
      {combatants.map((c) => {
        const hp = c.hp || { current: 0, max: 1 };
        const pct = Math.max(0, Math.min(100, (hp.current / hp.max) * 100));
        const isDown = hp.current <= 0;
        return (
          <li
            key={c.id}
            className={`player-combat__card ${c.playerId === identityId ? 'is-you' : ''}`}
            style={{ borderLeftColor: c.color }}
          >
            <div className="player-combat__hp-row">
              <span className="player-combat__name">{c.name}</span>
              <span className={`player-combat__hp ${isDown ? 'is-down' : ''}`}>
                {hp.current} / {hp.max}
              </span>
            </div>
            <div className="player-combat__hp-bar">
              <div className={`player-combat__hp-fill ${isDown ? 'is-down' : ''}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
