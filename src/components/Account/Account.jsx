import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import './Account.css';

export default function Account() {
  const { user, login, logout, setPremium, isSupabaseConfigured, t } = useApp();
  const [emailInput, setEmailInput] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    login(trimmed);
    setEmailInput('');
  };

  if (!user.isAuthenticated) {
    return (
      <section className="account">
        <h2>{t('account.title')}</h2>
        <p className="account__intro">{t('account.introGuest')}</p>
        <form className="account__login-form" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder={t('account.emailPlaceholder')}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
          />
          <button type="submit">{t('account.loginButton')}</button>
        </form>
        <p className="account__disclaimer">{t('account.disclaimerGuest')}</p>
      </section>
    );
  }

  return (
    <section className="account">
      <h2>{t('account.title')}</h2>
      <div className="account__info">
        <span className="account__email">{user.email}</span>
        <span className={`account__badge ${user.isPremium ? 'is-premium' : ''}`}>
          {user.isPremium ? t('account.planPremium') : t('account.planFree')}
        </span>
      </div>

      {!isSupabaseConfigured && <p className="account__warning">{t('account.warningNoSupabase')}</p>}

      <div className="account__actions">
        {user.isPremium ? (
          <button type="button" onClick={() => setPremium(false)}>
            {t('account.cancelButton')}
          </button>
        ) : (
          <button type="button" className="account__subscribe" onClick={() => setPremium(true)}>
            {t('account.subscribeButton')}
          </button>
        )}
        <button type="button" className="account__logout" onClick={logout}>
          {t('account.logoutButton')}
        </button>
      </div>
      <p className="account__disclaimer">{t('account.disclaimerUser')}</p>
    </section>
  );
}
