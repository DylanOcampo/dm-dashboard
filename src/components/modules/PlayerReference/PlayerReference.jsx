import { useApp } from '../../../context/AppContext';
import PlayerStatCard from '../../common/PlayerStatCard/PlayerStatCard';
import '../../common/PlayerStatCard/PlayerStatCard.css';

export default function PlayerReference() {
  const { players, t } = useApp();

  if (players.length === 0) {
    return <p className="player-stat-list__empty">{t('players.emptyList')}</p>;
  }

  return (
    <ul className="player-stat-list">
      {players.map((player) => (
        <PlayerStatCard key={player.id} player={player} isSelf={false} t={t} />
      ))}
    </ul>
  );
}
