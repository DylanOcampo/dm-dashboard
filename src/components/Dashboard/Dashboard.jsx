import { useMemo, useState } from 'react';
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
import PDFViewer from '../modules/PDFViewer/PDFViewer';
import ImageViewer from '../modules/ImageViewer/ImageViewer';
import ConditionTracker from '../modules/ConditionTracker/ConditionTracker';
import HPTracker from '../modules/HPTracker/HPTracker';
import MonsterReference from '../modules/MonsterReference/MonsterReference';
import NPCReference from '../modules/NPCReference/NPCReference';
import SaveThrowTracker from '../modules/SaveThrowTracker/SaveThrowTracker';
import Calculator from '../modules/Calculator/Calculator';
import './Dashboard.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const MODULE_COMPONENTS = {
  time: TimeModule,
  music: MusicModule,
  initiative: InitiativeTracker,
  loot: LootGenerator,
  notes: NotesModule,
  dice: DiceRoller,
  soundboard: Soundboard,
  pdf: PDFViewer,
  image: ImageViewer,
  condition: ConditionTracker,
  hp: HPTracker,
  monsters: MonsterReference,
  npcs: NPCReference,
  saveThrows: SaveThrowTracker,
  calculator: Calculator,
};

export default function Dashboard() {
  const {
    dashboardLayout,
    setDashboardLayout,
    allModules,
    addModuleInstance,
    removeModuleInstance,
    scenes,
    activeSceneId,
    setActiveSceneId,
    addScene,
    renameScene,
    removeScene,
    t,
  } = useApp();
  const [selectedModuleType, setSelectedModuleType] = useState(allModules[0]?.id ?? '');

  const layouts = useMemo(() => ({ lg: dashboardLayout, md: dashboardLayout, sm: dashboardLayout }), [dashboardLayout]);

  const handleAddModule = () => {
    if (!selectedModuleType) return;
    addModuleInstance(selectedModuleType);
  };

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
      <div className="dashboard__scenes">
        {scenes.map((scene) =>
          scene.id === activeSceneId ? (
            <div key={scene.id} className="dashboard__scene-tab is-active">
              <input
                type="text"
                className="dashboard__scene-name-input"
                value={scene.name}
                onChange={(e) => renameScene(scene.id, e.target.value)}
                aria-label={t('scenes.renameAria')}
              />
              {scenes.length > 1 && (
                <button
                  type="button"
                  className="dashboard__scene-remove"
                  onClick={() => removeScene(scene.id)}
                  aria-label={t('scenes.removeAria', { name: scene.name })}
                >
                  ×
                </button>
              )}
            </div>
          ) : (
            <button
              key={scene.id}
              type="button"
              className="dashboard__scene-tab"
              onClick={() => setActiveSceneId(scene.id)}
            >
              {scene.name}
            </button>
          )
        )}
        <button type="button" className="dashboard__scene-add" onClick={addScene}>
          {t('scenes.addButton')}
        </button>
      </div>

      <div className="dashboard__toolbar">
        <span className="dashboard__toolbar-label">{t('dashboard.addModuleLabel')}</span>
        <select
          className="dashboard__module-select"
          value={selectedModuleType}
          onChange={(e) => setSelectedModuleType(e.target.value)}
        >
          {allModules.map((mod) => (
            <option key={mod.id} value={mod.id}>
              {mod.label}
            </option>
          ))}
        </select>
        <button type="button" className="dashboard__module-add" onClick={handleAddModule}>
          {t('dashboard.addButton')}
        </button>
      </div>

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
        {dashboardLayout.map((item) => {
          // moduleType con fallback a item.i para compatibilidad con layouts guardados
          // antes de que existieran instancias duplicadas (donde i == tipo de módulo).
          const moduleType = item.type || item.i;
          const ModuleComponent = MODULE_COMPONENTS[moduleType];
          if (!ModuleComponent) return null;
          const moduleTitle = t(`dashboard.modules.${moduleType}`);
          return (
            <div key={item.i} className="widget">
              <div className="widget__header">
                <span>{moduleTitle}</span>
                <button
                  type="button"
                  className="widget__close"
                  onClick={() => removeModuleInstance(item.i)}
                  aria-label={t('dashboard.removeModuleAria', { name: moduleTitle })}
                >
                  ×
                </button>
              </div>
              <div className="widget__body">
                <ModuleComponent instanceId={item.i} />
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
