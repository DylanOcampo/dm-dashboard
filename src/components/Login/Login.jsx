import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { user, authLoading, signUp, signIn, resetPassword, isSupabaseConfigured, t } = useApp();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ya hay sesión (login exitoso, o llegaste acá con una sesión activa):
  // seguí directo al dashboard.
  useEffect(() => {
    if (!authLoading && user.isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [authLoading, user.isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormNotice('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setFormNotice(t('account.signupSuccess'));
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setFormError(err.message || t('account.authErrorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setFormError('');
    setFormNotice('');
    if (!email) {
      setFormError(t('account.emailRequiredForReset'));
      return;
    }
    try {
      await resetPassword(email);
      setFormNotice(t('account.resetEmailSent'));
    } catch (err) {
      setFormError(err.message || t('account.authErrorGeneric'));
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__title">{t('login.title')}</h1>
        {!isSupabaseConfigured && <p className="login__warning">{t('account.warningNoSupabase')}</p>}
        <p className="login__intro">
          {mode === 'signup' ? t('account.introSignup') : t('login.intro')}
        </p>
        <form className="login__form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t('account.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('account.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button type="submit" disabled={submitting || !isSupabaseConfigured}>
            {mode === 'signup' ? t('account.signupButton') : t('account.loginButton')}
          </button>
        </form>
        {formError && <p className="login__error">{formError}</p>}
        {formNotice && <p className="login__notice">{formNotice}</p>}
        <div className="login__switch">
          {mode === 'signin' ? (
            <>
              <button type="button" className="login__link" onClick={() => setMode('signup')}>
                {t('account.switchToSignup')}
              </button>
              <button type="button" className="login__link" onClick={handleForgotPassword}>
                {t('account.forgotPassword')}
              </button>
            </>
          ) : (
            <button type="button" className="login__link" onClick={() => setMode('signin')}>
              {t('account.switchToSignin')}
            </button>
          )}
        </div>
        <button type="button" className="login__guest" onClick={() => navigate('/app')}>
          {t('login.guestButton')}
        </button>
        <button type="button" className="login__back" onClick={() => navigate('/')}>
          {t('login.backButton')}
        </button>
      </div>
    </div>
  );
}
