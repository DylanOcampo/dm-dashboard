import { PlayerSessionProvider, usePlayerSession } from './PlayerSessionContext';
import JoinScreen from './JoinScreen';
import PlayerDashboard from './PlayerDashboard';
import './PlayerApp.css';

function PlayerShell() {
  const { loading, error, identityId, t } = usePlayerSession();

  if (loading) {
    return (
      <div className="player-app__status">
        <p>{t('join.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="player-app__status">
        <p>{error === 'disabled' ? t('join.disabled') : t('join.notFound')}</p>
      </div>
    );
  }

  if (!identityId) {
    return <JoinScreen />;
  }

  return <PlayerDashboard />;
}

export default function PlayerApp({ token }) {
  return (
    <PlayerSessionProvider token={token}>
      <PlayerShell />
    </PlayerSessionProvider>
  );
}
