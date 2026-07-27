import { usePlayerSession } from '../PlayerSessionContext';
import { CONDITION_BY_ID } from '../../data/conditions';
import './PlayerCombat.css';

export default function PlayerInitiativeView() {
  const { liveCombat, identityId, t } = usePlayerSession();

  if (!liveCombat) {
    return <p className="player-combat__empty">{t('playerApp.waitingForCombat')}</p>;
  }

  const { combatants, currentTurnIndex } = liveCombat;

  return (
    <ul className="player-combat__list">
      {combatants.length === 0 && <li className="player-combat__empty">{t('initiative.emptyList')}</li>}
      {combatants.map((c, index) => (
        <li
          key={c.id}
          className={`player-combat__card ${index === currentTurnIndex ? 'is-current' : ''} ${
            c.playerId === identityId ? 'is-you' : ''
          }`}
          style={{ borderLeftColor: c.color }}
        >
          <span className="player-combat__initiative">{c.initiative}</span>
          <span className="player-combat__name">{c.name}</span>
          {c.hp && (
            <span className={`player-combat__hp ${c.hp.current <= 0 ? 'is-down' : ''}`}>
              ❤ {c.hp.current}/{c.hp.max}
            </span>
          )}
          {c.ac != null && <span className="player-combat__ac">🛡 {c.ac}</span>}
          {c.conditions?.map((cond) => (
            <span key={cond.id} className="player-combat__condition">
              {CONDITION_BY_ID[cond.type]?.emoji ?? '❓'}
              {cond.remainingRounds}
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}
