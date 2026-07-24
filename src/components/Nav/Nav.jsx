import { useApp } from '../../context/AppContext';
import './Nav.css';

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'players', label: 'Jugadores' },
  { id: 'enemies', label: 'Enemigos' },
  { id: 'lootTable', label: 'Loot Table' },
  { id: 'account', label: 'Mi Cuenta' },
];

export default function Nav({ activeView, onChangeView }) {
  const { user } = useApp();

  return (
    <nav className="nav">
      <span className="nav__brand">🐉 DM Dashboard</span>
      <div className="nav__links">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`nav__link ${activeView === view.id ? 'is-active' : ''}`}
            onClick={() => onChangeView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>
      <span className="nav__status">
        {user.isAuthenticated ? (user.isPremium ? '☁️ Nube' : '💾 Local') : '💾 Local (invitado)'}
      </span>
    </nav>
  );
}
