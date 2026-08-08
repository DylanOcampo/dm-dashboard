import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import dashboardIcon from '../../assets/Dashboard/Dashboard.png';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { t, user, authLoading } = useApp();

  // Si ya hay una sesión activa (ej. volviste con el navegador atrás),
  // no tiene sentido mostrarle la landing: va directo al dashboard.
  useEffect(() => {
    if (!authLoading && user.isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [authLoading, user.isAuthenticated, navigate]);

  return (
    <div className="landing">
      <div className="landing__card">
        <img src={dashboardIcon} alt="" className="landing__icon" />
        <h1 className="landing__title">{t('nav.brand')}</h1>
        <p className="landing__tagline">{t('landing.tagline')}</p>
        <div className="landing__actions">
          <button type="button" className="landing__button landing__button--primary" onClick={() => navigate('/login')}>
            {t('landing.loginButton')}
          </button>
          <button type="button" className="landing__button" onClick={() => navigate('/app')}>
            {t('landing.guestButton')}
          </button>
        </div>
        <p className="landing__hint">{t('landing.guestHint')}</p>
      </div>
    </div>
  );
}
