import { useEffect, useState } from 'react';

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Landing from './components/Landing/Landing';
import Login from './components/Login/Login';
import Nav from './components/Nav/Nav';
import Header from './components/Header/Header';
import Dashboard from './components/Dashboard/Dashboard';
import PlayerManager from './components/PlayerManager/PlayerManager';
import EnemyManager from './components/EnemyManager/EnemyManager';
import NPCManager from './components/NPCManager/NPCManager';
import LootTableManager from './components/LootTableManager/LootTableManager';
import Account from './components/Account/Account';
import ShareSettings from './components/ShareSettings/ShareSettings';
import './App.css';

function AppShell() {
  const [activeView, setActiveView] = useState('dashboard');
  const { refreshSubscription } = useApp();

  // Al volver de Stripe Checkout/Billing Portal (?checkout=success|cancelled)
  // refresca la suscripción (el webhook ya debería haber corrido) y limpia
  // el query param. No hay router de datos para esto, se maneja a mano.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('checkout')) {
      refreshSubscription();
      setActiveView('account');
      params.delete('checkout');
      const newSearch = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
    <Header onChangeView={setActiveView} ></Header>
    <div className="app-shell">
      <Nav activeView={activeView} onChangeView={setActiveView} />
      <main className="app-shell__content">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'players' && <PlayerManager />}
        {activeView === 'enemies' && <EnemyManager />}
        {activeView === 'npcs' && <NPCManager />}
        {activeView === 'lootTable' && <LootTableManager />}
        {activeView === 'share' && <ShareSettings />}
        {activeView === 'account' && <Account />}
      </main>



    </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<AppShell />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
