import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Nav from './components/Nav/Nav';
import Dashboard from './components/Dashboard/Dashboard';
import PlayerManager from './components/PlayerManager/PlayerManager';
import EnemyManager from './components/EnemyManager/EnemyManager';
import LootTableManager from './components/LootTableManager/LootTableManager';
import Account from './components/Account/Account';
import './App.css';

function AppShell() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div className="app-shell">
      <Nav activeView={activeView} onChangeView={setActiveView} />
      <main className="app-shell__content">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'players' && <PlayerManager />}
        {activeView === 'enemies' && <EnemyManager />}
        {activeView === 'lootTable' && <LootTableManager />}
        {activeView === 'account' && <Account />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
