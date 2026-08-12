import { useMemo } from 'react';
import { WidthProvider, Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { useApp } from '../../context/AppContext';
import TimeModule from '../modules/TimeModule/TimeModule';
import MusicModule from '../modules/MusicModule/MusicModule';
import InitiativeTracker from '../modules/InitiativeTracker/InitiativeTracker';
import LootGenerator from '../modules/LootGenerator/LootGenerator';
import NotesModule from '../modules/NotesModule/NotesModule';
import DiceRoller from '../modules/DiceRoller/DiceRoller';
import Soundboard from '../modules/Soundboard/Soundboard';
import FileViewer from '../modules/FileViewer/FileViewer';
import ConditionTracker from '../modules/ConditionTracker/ConditionTracker';
import HPTracker from '../modules/HPTracker/HPTracker';
import MonsterReference from '../modules/MonsterReference/MonsterReference';
import NPCReference from '../modules/NPCReference/NPCReference';
import PlayerReference from '../modules/PlayerReference/PlayerReference';
import SaveThrowTracker from '../modules/SaveThrowTracker/SaveThrowTracker';
import Calculator from '../modules/Calculator/Calculator';
import dashboardDeco from '../../assets/General/Dashboard-deco.svg';
import './Dashboard.css';

import chevron from '../../assets/General/ChevronDown.svg';

const ResponsiveGridLayout = WidthProvider(Responsive);

const MODULE_COMPONENTS = {
  time: TimeModule,
  music: MusicModule,
  initiative: InitiativeTracker,
  loot: LootGenerator,
  notes: NotesModule,
  dice: DiceRoller,
  soundboard: Soundboard,
  files: FileViewer,
  pdf: FileViewer,
  image: FileViewer,
  condition: ConditionTracker,
  hp: HPTracker,
  monsters: MonsterReference,
  npcs: NPCReference,
  playerReference: PlayerReference,
  saveThrows: SaveThrowTracker,
  calculator: Calculator,
};

export default function Dashboard() {
  const {
    dashboardLayout,
    setDashboardLayout,
    removeModuleInstance,
    toggleModuleMinimized,
    t,
  } = useApp();


  const layouts = useMemo(() => ({ lg: dashboardLayout, md: dashboardLayout, sm: dashboardLayout }), [dashboardLayout]);


  const handleLayoutChange = (currentLayout) => {
    setDashboardLayout((prev) =>
      currentLayout.map((item) => {
        const original = prev.find((p) => p.i === item.i) || {};
        return { ...original, ...item };
      })
    );
  };

  return (
    <div className="dashboard">
      <img src={dashboardDeco} alt="" aria-hidden="true" className="dashboard__deco dashboard__deco--left" />
      <img src={dashboardDeco} alt="" aria-hidden="true" className="dashboard__deco dashboard__deco--right" />

      <ResponsiveGridLayout
        className="dashboard__grid"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 900, sm: 600 }}
        cols={{ lg: 12, md: 8, sm: 4 }}
        rowHeight={30}
        draggableHandle=".widget__header"
        draggableCancel=".widget__close, .widget__minimize"
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
      >
        {dashboardLayout.map((item) => {
          // moduleType con fallback a item.i para compatibilidad con layouts guardados
          // antes de que existieran instancias duplicadas (donde i == tipo de módulo).
          const moduleType = item.type || item.i;
          const ModuleComponent = MODULE_COMPONENTS[moduleType];
          if (!ModuleComponent) return null;
          const moduleTitle = t(`dashboard.modules.${moduleType}`);
          return (
            <div key={item.i} className={`widget${item.minimized ? ' widget--minimized' : ''}`}>
              <div className="widget__header">
                <div className="widget__header-left">
                  <button
                    type="button"
                    className="widget__minimize"
                    onClick={() => toggleModuleMinimized(item.i)}
                    aria-label={t(item.minimized ? 'dashboard.expandModuleAria' : 'dashboard.minimizeModuleAria', { name: moduleTitle })}
                  >
                    <img src={chevron} alt="" aria-hidden="true" className="widget__minimize-icon" />
                  </button>
                  <span>{moduleTitle}</span>
                </div>
                <div className="widget__close-container">
                  <button
                  type="button"
                  className="widget__close"
                  onClick={() => removeModuleInstance(item.i)}
                  aria-label={t('dashboard.removeModuleAria', { name: moduleTitle })}
                >

                </button>
                </div>
              </div>
              <div className="widget__body">
                <ModuleComponent instanceId={item.i} moduleType={moduleType} />
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
