import { usePlayerSession, SPECTATOR_ID } from '../PlayerSessionContext';
import PlayerStatCard from '../../components/common/PlayerStatCard/PlayerStatCard';
import '../../components/common/PlayerStatCard/PlayerStatCard.css';

export default function PlayerCharacterReference() {
  const { selectedPlayer, identityId, t } = usePlayerSession();

  if (!identityId || identityId === SPECTATOR_ID || !selectedPlayer) {
    return <p className="player-stat-list__empty">{t('playerApp.noCharacterSelected')}</p>;
  }

  return (
    <ul className="player-stat-list">
      <PlayerStatCard player={selectedPlayer} isSelf t={t} />
    </ul>
  );
}
