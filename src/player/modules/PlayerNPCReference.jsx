import { usePlayerSession } from '../PlayerSessionContext';
import './PlayerReference.css';

export default function PlayerNPCReference() {
  const { snapshot, t } = usePlayerSession();
  const npcs = snapshot?.shared_npcs || [];

  if (npcs.length === 0) {
    return <p className="player-reference__empty">{t('playerApp.noRevealedNpcs')}</p>;
  }

  return (
    <ul className="player-reference__list">
      {npcs.map((npc) => (
        <li key={npc.id} className="player-reference__card" style={{ borderLeftColor: npc.color }}>
          <div className="player-reference__row">
            <span className="player-reference__avatar">
              {npc.avatar ? <img src={npc.avatar} alt="" /> : '🙂'}
            </span>
            <span className="player-reference__name">{npc.name}</span>
            {npc.isCombat && (
              <>
                <span className="player-reference__stat">🛡 {npc.ac}</span>
                <span className="player-reference__stat">❤ {npc.hpMax}</span>
              </>
            )}
          </div>
          {npc.description && <p className="player-reference__notes">{npc.description}</p>}
        </li>
      ))}
    </ul>
  );
}
