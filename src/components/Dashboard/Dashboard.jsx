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
  calculator: Calculator,
};

const MODULE_TITLES = {
  time: 'Tiempo',
  music: 'Música',
  initiative: 'Tracker de Iniciativa',
  loot: 'Loot Generator',
  notes: 'Notas',
  dice: 'Dados',
  soundboard: 'Soundboard',
  pdf: 'Visor de PDF',
  image: 'Visor de Imágenes',
  condition: 'Condition Tracker',
  hp: 'HP Tracker',
  monsters: 'Monster Reference',
  calculator: 'Calculadora',
};

export default function Dashboard() {
  const { dashboardLayout, setDashboardLayout, allModules, addModuleInstance, removeModuleInstance } = useApp();
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
      <div className="dashboard__toolbar">
        <span className="dashboard__toolbar-label">Agregar módulo:</span>
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
          + Agregar
        </button>
      </div>

      <ResponsiveGridLayout
        className="dashboard__grid"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 900, sm: 600 }}
        cols={{ lg: 12, md: 8, sm: 4 }}
        rowHeight={30}
        draggableHandle=".widget__header"
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
      >
        {dashboardLayout.map((item) => {
          // moduleType con fallback a item.i para compatibilidad con layouts guardados
          // antes de que existieran instancias duplicadas (donde i == tipo de módulo).
          const moduleType = item.type || item.i;
          const ModuleComponent = MODULE_COMPONENTS[moduleType];
          if (!ModuleComponent) return null;
          return (
            <div key={item.i} className="widget">
              <div className="widget__header">
                <span>{MODULE_TITLES[moduleType]}</span>
                <button
                  type="button"
                  className="widget__close"
                  onClick={() => removeModuleInstance(item.i)}
                  aria-label={`Quitar módulo ${MODULE_TITLES[moduleType]}`}
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
