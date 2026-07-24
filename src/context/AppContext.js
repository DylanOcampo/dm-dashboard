import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { usePersistedState } from '../hooks/usePersistedState';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { createDefaultLootTable } from '../data/defaultLootTable';
import { translate, DEFAULT_LANGUAGE } from '../i18n/language';

const AppContext = createContext(null);

const PLAYER_COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#9d4edd', '#f4a261'];
const ENEMY_COLORS = ['#6c757d', '#8d5524', '#a4243b', '#4a4e69', '#5f6b3f', '#5c3d2e'];

function createDefaultLayout() {
  return [
    { i: uuid(), type: 'time', x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: uuid(), type: 'music', x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: uuid(), type: 'initiative', x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 4 },
    { i: uuid(), type: 'loot', x: 0, y: 4, w: 4, h: 8, minW: 3, minH: 4 },
    { i: uuid(), type: 'notes', x: 4, y: 4, w: 4, h: 8, minW: 3, minH: 4 },
  ];
}

const ALL_MODULE_IDS = [
  'time',
  'music',
  'initiative',
  'loot',
  'notes',
  'dice',
  'soundboard',
  'pdf',
  'image',
  'condition',
  'hp',
  'monsters',
  'calculator',
];

const EMPTY_COMBAT = { combatants: [], currentTurnIndex: 0 };

export function AppProvider({ children }) {
  // --- Idioma (persistido localmente; ver src/i18n/language.js) ---
  const [language, setLanguage] = usePersistedState('language', DEFAULT_LANGUAGE);
  const t = useCallback((key, vars) => translate(language, key, vars), [language]);

  // --- Cuenta / suscripción (mock, sin pago real todavía) ---
  const [user, setUser] = useState(() => ({ id: null, email: null, isAuthenticated: false, isPremium: false }));

  const login = useCallback((email) => {
    setUser({ id: uuid(), email, isAuthenticated: true, isPremium: false });
  }, []);

  const logout = useCallback(() => {
    setUser({ id: null, email: null, isAuthenticated: false, isPremium: false });
  }, []);

  const setPremium = useCallback((isPremium) => {
    setUser((prev) => ({ ...prev, isPremium }));
  }, []);

  const syncEnabled = isSupabaseConfigured && user.isAuthenticated && user.isPremium;
  const syncOptions = useMemo(() => ({ syncEnabled, userId: user.id }), [syncEnabled, user.id]);

  // --- Jugadores (compartidos entre todas las copias de módulos) ---
  const [players, setPlayers] = usePersistedState('players', [], syncOptions);

  const addPlayer = useCallback(() => {
    setPlayers((prev) => [
      ...prev,
      {
        id: uuid(),
        name: t('players.defaultName', { n: prev.length + 1 }),
        level: 1,
        color: PLAYER_COLORS[prev.length % PLAYER_COLORS.length],
      },
    ]);
  }, [setPlayers, t]);

  const updatePlayer = useCallback(
    (id, changes) => {
      setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
    },
    [setPlayers]
  );

  const removePlayer = useCallback(
    (id) => {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    },
    [setPlayers]
  );

  // --- Loot table (compartida entre todas las copias de módulos) ---
  const [lootTable, setLootTable] = usePersistedState('lootTable', createDefaultLootTable, syncOptions);

  // --- Combates: uno por cada instancia de Tracker de Iniciativa, compartido
  // en vivo con cualquier Condition Tracker que se vincule a esa instancia. ---
  const [combats, setCombats] = usePersistedState('combats', {}, syncOptions);

  const getCombat = useCallback((instanceId) => combats[instanceId] || EMPTY_COMBAT, [combats]);

  const updateCombatants = useCallback(
    (instanceId, updater) => {
      setCombats((prev) => {
        const current = prev[instanceId] || EMPTY_COMBAT;
        return { ...prev, [instanceId]: { ...current, combatants: updater(current.combatants) } };
      });
    },
    [setCombats]
  );

  const nextTurn = useCallback(
    (instanceId) => {
      setCombats((prev) => {
        const current = prev[instanceId] || EMPTY_COMBAT;
        if (current.combatants.length === 0) return prev;
        const nextIndex = (current.currentTurnIndex + 1) % current.combatants.length;
        const roundComplete = nextIndex === 0;
        // Al completar una ronda (volver al primer combatiente), las
        // condiciones con duración en rondas bajan un punto y se remueven
        // las que llegan a 0.
        const combatants = roundComplete
          ? current.combatants.map((c) => ({
              ...c,
              conditions: (c.conditions || [])
                .map((cond) => ({ ...cond, remainingRounds: cond.remainingRounds - 1 }))
                .filter((cond) => cond.remainingRounds > 0),
            }))
          : current.combatants;
        return { ...prev, [instanceId]: { ...current, currentTurnIndex: nextIndex, combatants } };
      });
    },
    [setCombats]
  );

  const setCombatTurnIndex = useCallback(
    (instanceId, index) => {
      setCombats((prev) => {
        const current = prev[instanceId] || EMPTY_COMBAT;
        return { ...prev, [instanceId]: { ...current, currentTurnIndex: index } };
      });
    },
    [setCombats]
  );

  const removeCombat = useCallback(
    (instanceId) => {
      setCombats((prev) => {
        if (!(instanceId in prev)) return prev;
        const next = { ...prev };
        delete next[instanceId];
        return next;
      });
    },
    [setCombats]
  );

  // --- Enemigos (roster compartido entre todas las copias de módulos, igual
  // que los jugadores: se administran en su propia sección y se agregan a un
  // combate desde el Tracker de Iniciativa, el Monster Reference, etc.) ---
  const [enemies, setEnemies] = usePersistedState('enemies', [], syncOptions);

  const addEnemy = useCallback(() => {
    setEnemies((prev) => [
      ...prev,
      {
        id: uuid(),
        name: t('enemies.defaultName', { n: prev.length + 1 }),
        color: ENEMY_COLORS[prev.length % ENEMY_COLORS.length],
        ac: 10,
        hpMax: 10,
        speed: '9 m',
        attacks: '',
        notes: '',
      },
    ]);
  }, [setEnemies, t]);

  const updateEnemy = useCallback(
    (id, changes) => {
      setEnemies((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));
    },
    [setEnemies]
  );

  const removeEnemy = useCallback(
    (id) => {
      setEnemies((prev) => prev.filter((e) => e.id !== id));
    },
    [setEnemies]
  );

  const addEnemyToCombat = useCallback(
    (instanceId, enemy) => {
      updateCombatants(instanceId, (prev) => [
        ...prev,
        {
          id: uuid(),
          name: enemy.name,
          color: enemy.color || ENEMY_COLORS[0],
          type: 'enemy',
          sourceEnemyId: enemy.id,
          initiative: Math.floor(Math.random() * 20) + 1,
          conditions: [],
          hp: { current: enemy.hpMax || 10, max: enemy.hpMax || 10 },
          ac: enemy.ac,
          notes: [enemy.attacks, enemy.notes].filter(Boolean).join(' — '),
        },
      ]);
    },
    [updateCombatants]
  );

  // --- Layout del dashboard: cada item es una instancia única de un módulo ---
  const [dashboardLayout, setDashboardLayout] = usePersistedState('dashboardLayout', createDefaultLayout, syncOptions);

  const addModuleInstance = useCallback(
    (moduleType) => {
      setDashboardLayout((prev) => {
        const maxY = prev.reduce((acc, item) => Math.max(acc, item.y + item.h), 0);
        return [...prev, { i: uuid(), type: moduleType, x: 0, y: maxY, w: 4, h: 6, minW: 3, minH: 3 }];
      });
    },
    [setDashboardLayout]
  );

  const removeModuleInstance = useCallback(
    (instanceId) => {
      setDashboardLayout((prev) => prev.filter((item) => item.i !== instanceId));
      removeCombat(instanceId);
    },
    [setDashboardLayout, removeCombat]
  );

  const allModules = useMemo(
    () => ALL_MODULE_IDS.map((id) => ({ id, label: t(`dashboard.modules.${id}`) })),
    [t]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      user,
      login,
      logout,
      setPremium,
      isSupabaseConfigured,
      syncOptions,
      players,
      addPlayer,
      updatePlayer,
      removePlayer,
      lootTable,
      setLootTable,
      getCombat,
      updateCombatants,
      nextTurn,
      setCombatTurnIndex,
      enemies,
      addEnemy,
      updateEnemy,
      removeEnemy,
      addEnemyToCombat,
      dashboardLayout,
      setDashboardLayout,
      addModuleInstance,
      removeModuleInstance,
      allModules,
    }),
    [
      language,
      setLanguage,
      t,
      user,
      login,
      logout,
      setPremium,
      players,
      addPlayer,
      updatePlayer,
      removePlayer,
      getCombat,
      updateCombatants,
      nextTurn,
      setCombatTurnIndex,
      lootTable,
      setLootTable,
      enemies,
      addEnemy,
      updateEnemy,
      removeEnemy,
      addEnemyToCombat,
      dashboardLayout,
      setDashboardLayout,
      addModuleInstance,
      removeModuleInstance,
      allModules,
      syncOptions,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
