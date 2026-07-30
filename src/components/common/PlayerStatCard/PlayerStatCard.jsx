import './PlayerStatCard.css';

export default function PlayerStatCard({ player, isSelf, t }) {
  const hp = player.hp || { current: 10, max: 10 };
  return (
    <li className="player-stat-card" style={{ borderLeftColor: player.color }}>
      <div className="player-stat-card__header">
        <span className="player-stat-card__avatar">
          {player.avatar ? <img src={player.avatar} alt="" /> : (player.name || '?')[0]}
        </span>
        <div className="player-stat-card__title">
          <span className="player-stat-card__name">
            {player.name}
            {isSelf && <span className="player-stat-card__self"> ({t('playerApp.selfTag')})</span>}
          </span>
          <span className="player-stat-card__subtitle">
            {player.class ? `${player.class} — ` : ''}
            {t('players.levelLabel')} {player.level}
          </span>
        </div>
      </div>

      <div className="player-stat-card__stats">
        <span className="player-stat-card__stat">
          🛡 {t('players.acLabel')} {player.ac ?? '—'}
        </span>
        <span className="player-stat-card__stat">
          ❤ {hp.current}/{hp.max}
        </span>
      </div>

      {player.customStats?.length > 0 && (
        <ul className="player-stat-card__custom-stats">
          {player.customStats.map((stat) => (
            <li key={stat.id} className="player-stat-card__custom-stat">
              <span className="player-stat-card__custom-stat-label">{stat.label}</span>
              <span className="player-stat-card__custom-stat-value">{stat.value}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
