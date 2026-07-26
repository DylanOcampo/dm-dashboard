import { useApp } from '../../context/AppContext';
import { LANGUAGES } from '../../i18n/language';
import './Nav.css';

export default function Nav({ activeView, onChangeView }) {
  const { user, t, language, setLanguage } = useApp();

  const VIEWS = [
    { id: 'dashboard', label: t('nav.dashboard') },
    { id: 'players', label: t('nav.players') },
    { id: 'enemies', label: t('nav.enemies') },
    { id: 'npcs', label: t('nav.npcs') },
    { id: 'lootTable', label: t('nav.lootTable') },
    ...(user.hasSubscribedBefore ? [{ id: 'fileManager', label: t('nav.fileManager') }] : []),
    { id: 'account', label: t('nav.account') },
  ];

  const statusLabel = user.isAuthenticated
    ? user.isPremium
      ? t('nav.statusCloud')
      : user.isInactiveSubscriber
        ? t('nav.statusInactive')
        : t('nav.statusLocal')
    : t('nav.statusGuest');

  return (
    <nav className="nav">
      <span className="nav__brand">{t('nav.brand')}</span>
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
      <span className="nav__status">{statusLabel}</span>
    </nav>
  );
}
