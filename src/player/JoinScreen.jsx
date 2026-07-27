import { usePlayerSession, SPECTATOR_ID } from './PlayerSessionContext';
import './JoinScreen.css';

export default function JoinScreen() {
  const { snapshot, t, setIdentity } = usePlayerSession();
  const players = snapshot?.shared_players || [];

  return (
    <div className="join-screen">
      <h1>{t('join.title')}</h1>
      <p className="join-screen__intro">{t('join.intro')}</p>
      <ul className="join-screen__list">
        {players.map((player) => (
          <li key={player.id}>
            <button type="button" className="join-screen__player" onClick={() => setIdentity(player.id)}>
              <span className="join-screen__avatar">
                {player.avatar ? <img src={player.avatar} alt="" /> : (player.name || '?')[0]}
              </span>
              <span className="join-screen__name">{player.name}</span>
              {player.class && <span className="join-screen__class">{player.class}</span>}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="join-screen__spectator" onClick={() => setIdentity(SPECTATOR_ID)}>
        {t('join.spectatorButton')}
      </button>
    </div>
  );
}
