import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LANGUAGES } from '../../i18n/language';
import dashboardIcon from '../../assets/Dashboard/Dashboard.png';
import playerIcon from '../../assets/Dashboard/Player.png';
import enemiesIcon from '../../assets/Dashboard/Enemies.png';
import npcsIcon from '../../assets/Dashboard/Npcs.png';
import lootTableIcon from '../../assets/Dashboard/LootTable.png';
import './Nav.css';

export default function Nav({ activeView, onChangeView }) {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useApp();

  const VIEWS = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: dashboardIcon },
    { id: 'players', label: t('nav.players'), icon: playerIcon },
    { id: 'enemies', label: t('nav.enemies'), icon: enemiesIcon },
    { id: 'npcs', label: t('nav.npcs'), icon: npcsIcon },
    { id: 'lootTable', label: t('nav.lootTable'), icon: lootTableIcon },

  ];


  return (
    <nav className="nav">

      <div className="nav__links">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`nav__link ${activeView === view.id ? 'is-active' : ''}`}
            onClick={() => onChangeView(view.id)}
          >
            {view.icon ? (
              <img src={view.icon} alt="" className="nav__link-icon" />
            ) : (
              <span className="nav__link-icon nav__link-icon--emoji">{view.emoji}</span>
            )}
            <span className="nav__link-label">{view.label}</span>
          </button>
        ))}
      </div>
      <div className="nav__footer">
        <select
          className="nav__language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label={t('nav.language')}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>

      </div>
    </nav>
  );
}
