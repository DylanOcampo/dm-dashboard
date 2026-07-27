import { usePlayerSession } from '../PlayerSessionContext';
import './PlayerReference.css';

export default function PlayerMonsterReference() {
  const { snapshot, t } = usePlayerSession();
  const enemies = snapshot?.shared_enemies || [];

  if (enemies.length === 0) {
    return <p className="player-reference__empty">{t('playerApp.noRevealedEnemies')}</p>;
  }

  return (
    <ul className="player-reference__list">
      {enemies.map((enemy) => (
        <li key={enemy.id} className="player-reference__card" style={{ borderLeftColor: enemy.color }}>
          <div className="player-reference__row">
            <span className="player-reference__avatar">
              {enemy.avatar ? <img src={enemy.avatar} alt="" /> : '⚔'}
            </span>
            <span className="player-reference__name">{enemy.name}</span>
            <span className="player-reference__stat">🛡 {enemy.ac}</span>
            <span className="player-reference__stat">❤ {enemy.hpMax}</span>
            <span className="player-reference__stat">{enemy.speed}</span>
          </div>
          {enemy.attacks && <p className="player-reference__notes">{enemy.attacks}</p>}
        </li>
      ))}
    </ul>
  );
}
