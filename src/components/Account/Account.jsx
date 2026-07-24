import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import './Account.css';

export default function Account() {
  const { user, login, logout, setPremium, isSupabaseConfigured } = useApp();
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
        <h2>Mi cuenta</h2>
        <p className="account__intro">
          Sin cuenta, todo tu contenido (jugadores, loot table, notas, layout) se guarda solo en
          este navegador. Crea una cuenta y suscríbete para respaldar tu sesión en la nube.
        </p>
        <form className="account__login-form" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="tu@email.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
          />
          <button type="submit">Crear cuenta / Ingresar</button>
        </form>
        <p className="account__disclaimer">
          Este es un flujo de demostración: no se realiza ningún cobro ni autenticación real todavía.
        </p>
      </section>
    );
  }

  return (
    <section className="account">
      <h2>Mi cuenta</h2>
      <div className="account__info">
        <span className="account__email">{user.email}</span>
        <span className={`account__badge ${user.isPremium ? 'is-premium' : ''}`}>
          {user.isPremium ? 'Suscripción activa' : 'Plan gratuito'}
        </span>
      </div>

      {!isSupabaseConfigured && (
        <p className="account__warning">
          Aún no hay un proyecto Supabase conectado (faltan las variables de entorno), así que por
          ahora tus datos se siguen guardando en este navegador incluso con la suscripción activa.
        </p>
      )}

      <div className="account__actions">
        {user.isPremium ? (
          <button type="button" onClick={() => setPremium(false)}>
            Cancelar suscripción
          </button>
        ) : (
          <button type="button" className="account__subscribe" onClick={() => setPremium(true)}>
            Suscribirse y guardar en la nube
          </button>
        )}
        <button type="button" className="account__logout" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
      <p className="account__disclaimer">
        Este es un flujo de demostración: no se realiza ningún cobro real todavía.
      </p>
    </section>
  );
}
