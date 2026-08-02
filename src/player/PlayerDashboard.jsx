import { useMemo, useState } from 'react';
import { WidthProvider, Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { usePlayerSession, SPECTATOR_ID } from './PlayerSessionContext';
import { LANGUAGES } from '../i18n/language';
import TimeModule from '../components/modules/TimeModule/TimeModule';
import MusicModule from '../components/modules/MusicModule/MusicModule';
import NotesModule from '../components/modules/NotesModule/NotesModule';
import DiceRoller from '../components/modules/DiceRoller/DiceRoller';
import Soundboard from '../components/modules/Soundboard/Soundboard';
import Calculator from '../components/modules/Calculator/Calculator';
import PlayerFileViewer from './modules/PlayerFileViewer';
import PlayerInitiativeView from './modules/PlayerInitiativeView';
import PlayerHPView from './modules/PlayerHPView';
import PlayerSaveThrowView from './modules/PlayerSaveThrowView';
import PlayerMonsterReference from './modules/PlayerMonsterReference';
import PlayerNPCReference from './modules/PlayerNPCReference';
import PlayerCharacterReference from './modules/PlayerCharacterReference';
import '../components/Dashboard/Dashboard.css';
import './PlayerDashboard.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const PLAYER_MODULE_COMPONENTS = {
  time: TimeModule,
  music: MusicModule,
  notes: NotesModule,
  dice: DiceRoller,
  soundboard: Soundboard,
  calculator: Calculator,
  files: PlayerFileViewer,
  pdf: PlayerFileViewer,
  image: PlayerFileViewer,
  initiative: PlayerInitiativeView,
  hp: PlayerHPView,
  saveThrows: PlayerSaveThrowView,
  monsters: PlayerMonsterReference,
  npcs: PlayerNPCReference,
  playerReference: PlayerCharacterReference,
};

export default function PlayerDashboard() {
  const {
    snapshot,
    t,
    language,
    setLanguage,
    selectedPlayer,
    identityId,
    setIdentity,
    layout,
    setPlayerLayout,
    addModuleInstance,
    removeModuleInstance,
    syncDashboard,
  } = usePlayerSession();

  const allowedTypes = snapshot?.shared_module_types || [];
  const [selectedType, setSelectedType] = useState(allowedTypes[0] ?? '');

  const layouts = useMemo(() => ({ lg: layout, md: layout, sm: layout }), [layout]);

  const handleAddModule = () => {
    if (!selectedType) return;
    addModuleInstance(selectedType);
  };

  const handleSync = () => {
    if (window.confirm(t('playerApp.syncConfirm'))) {
      syncDashboard();
    }
  };

  const handleLayoutChange = (currentLayout) => {
    setPlayerLayout((prev) =>
      currentLayout.map((item) => {
        const original = prev.find((p) => p.i === item.i) || {};
        return { ...original, ...item };
      })
    );
  };

  return (
    <div className="dashboard player-dashboard">
      <div className="player-dashboard__header">
        <span className="player-dashboard__brand">{t('playerApp.brand')}</span>
        {identityId && identityId !== SPECTATOR_ID && selectedPlayer && (
          <span className="player-dashboard__identity">{t('playerApp.playingAs', { name: selectedPlayer.name })}</span>
        )}
        <button type="button" className="player-dashboard__change" onClick={() => setIdentity(null)}>
          {t('join.changeButton')}
        </button>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="player-dashboard__language">
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <button type="button" className="player-dashboard__sync" onClick={handleSync}>
          {t('playerApp.syncButton')}
        </button>
      </div>

      <div className="dashboard__toolbar">
        <span className="dashboard__toolbar-label">{t('playerApp.addModuleLabel')}</span>
        <select
          className="dashboard__module-select"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {allowedTypes.map((type) => (
            <option key={type} value={type}>
              {t(`dashboard.modules.${type}`)}
            </option>
          ))}
        </select>
        <button type="button" className="dashboard__module-add" onClick={handleAddModule} disabled={!selectedType}>
          {t('playerApp.addButton')}
        </button>
      </div>

      {layout.length === 0 && <p className="player-dashboard__empty">{t('playerApp.emptyLayout')}</p>}

      <ResponsiveGridLayout
        className="dashboard__grid"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 900, sm: 600 }}
        cols={{ lg: 12, md: 8, sm: 4 }}
        rowHeight={30}
        draggableHandle=".widget__header"
        draggableCancel=".widget__close"
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
      >
        {layout.map((item) => {
          const ModuleComponent = PLAYER_MODULE_COMPONENTS[item.type];
          if (!ModuleComponent) return null;
          const moduleTitle = t(`dashboard.modules.${item.type}`);
          return (
            <div key={item.i} className="widget">
              <div className="widget__header">
                <span>{moduleTitle}</span>
                <button
                  type="button"
                  className="widget__close"
                  onClick={() => removeModuleInstance(item.i)}
                  aria-label={t('playerApp.removeModuleAria', { name: moduleTitle })}
                >
                  ×
                </button>
              </div>
              <div className="widget__body">
                <ModuleComponent instanceId={item.i} moduleType={item.type} />
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
