import { usePlayerSession } from '../PlayerSessionContext';
import './PlayerCombat.css';

export default function PlayerSaveThrowView() {
  const { liveCombat, identityId, t } = usePlayerSession();

  if (!liveCombat) {
    return <p className="player-combat__empty">{t('playerApp.waitingForCombat')}</p>;
  }

  const downed = (liveCombat.combatants || []).filter((c) => (c.type === 'player' || c.type === 'npc') && c.hp?.current <= 0);

  if (downed.length === 0) {
    return <p className="player-combat__empty">{t('saveThrowTracker.emptyNoDowned')}</p>;
  }

  return (
    <ul className="player-combat__list">
      {downed.map((c) => (
        <li
          key={c.id}
          className={`player-combat__card ${c.playerId === identityId ? 'is-you' : ''}`}
          style={{ borderLeftColor: c.color }}
        >
          <span className="player-combat__name">{c.name}</span>
          {c.isDead ? (
            <span className="player-combat__dead">{t('saveThrowTracker.deadLabel')}</span>
          ) : (
            <span className="player-combat__saves">
              🎲 {c.deathSaves?.successes || 0}/{c.deathSaves?.failures || 0}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
