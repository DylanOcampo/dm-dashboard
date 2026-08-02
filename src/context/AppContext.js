import { createContext, useCallback, useContext, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { usePersistedState } from '../hooks/usePersistedState';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { useCloudFiles } from '../hooks/useCloudFiles';
import { useShareSync } from '../hooks/useShareSync';
import { useCombatBroadcast } from '../hooks/useCombatBroadcast';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { readLocal } from '../services/storageService';
import { deleteAccountRemote } from '../services/stripeService';
import { createDefaultLootTable } from '../data/defaultLootTable';
import { translate, DEFAULT_LANGUAGE } from '../i18n/language';

// Exportado (no solo AppProvider/useApp) para que PlayerSessionProvider
// pueda renderizar <AppContext.Provider> con un value mínimo compatible y
// así reusar los módulos "simples" (Time/Music/Notes/Dice/Soundboard/
// Calculator) sin forkearlos — ver src/player/PlayerSessionContext.js.
export const AppContext = createContext(null);

const PLAYER_COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#9d4edd', '#f4a261'];
const ENEMY_COLORS = ['#6c757d', '#8d5524', '#a4243b', '#4a4e69', '#5f6b3f', '#5c3d2e'];
const NPC_COLORS = ['#06d6a0', '#118ab2', '#8338ec', '#ffb703', '#3a86ff', '#fb8500'];

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
  'files',
  'condition',
  'hp',
  'monsters',
  'npcs',
  'playerReference',
  'saveThrows',
  'calculator',
];

const EMPTY_COMBAT = { combatants: [], currentTurnIndex: 0 };

// Migra el antiguo layout único (clave "dashboardLayout") a una primera
// escena, para que nadie pierda su dashboard ya armado al actualizar la app.
function createDefaultScenes() {
  const legacyLayout = readLocal('dashboardLayout', null);
  const lang = readLocal('language', DEFAULT_LANGUAGE);
  return [
    {
      id: uuid(),
      name: translate(lang, 'scenes.defaultName', { n: 1 }),
      layout: legacyLayout || createDefaultLayout(),
    },
  ];
}

export function AppProvider({ children }) {
  // --- Idioma (persistido localmente; ver src/i18n/language.js) ---
  const [language, setLanguage] = usePersistedState('language', DEFAULT_LANGUAGE);
  const t = useCallback((key, vars) => translate(language, key, vars), [language]);

  // --- Cuenta (Supabase Auth real) + suscripción (Stripe, vía subscriptions
  // table que solo escriben las Edge Functions) ---
  const { user: authUser, authLoading, signUp, signIn, signOut, resetPassword } = useAuth();
  const { subscription, refresh: refreshSubscription } = useSubscription(authUser.id);
  const { files: cloudFiles, refresh: refreshCloudFiles, storageUsedBytes } = useCloudFiles(authUser.id);

  const isPremium = subscription?.status === 'active' || subscription?.status === 'trialing';
  // Tuvo (o tiene) una suscripción pero no está activa ahora: sus archivos
  // en la nube pasan a solo lectura hasta que se vuelva a suscribir, y se
  // borran automáticamente 30 días después (ver cleanup-expired-files).
  const isInactiveSubscriber = Boolean(subscription) && !isPremium;

  const user = useMemo(
    () => ({
      ...authUser,
      isPremium,
      isInactiveSubscriber,
      hasSubscribedBefore: Boolean(subscription),
    }),
    [authUser, isPremium, isInactiveSubscriber, subscription]
  );

  const deleteAccount = useCallback(async () => {
    await deleteAccountRemote();
    await signOut();
  }, [signOut]);

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
        avatar: null,
        class: '',
        ac: 10,
        hp: { current: 10, max: 10 },
        customStats: [],
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

  // --- Biblioteca de notas: compartida entre todas las copias del módulo de
  // Notas (antes cada instancia tenía su propia lista). Cada instancia solo
  // recuerda qué nota tiene abierta (`notesOpen:<instanceId>`, ver
  // NotesModule.jsx), no una copia de los datos. ---
  const [notesLibrary, setNotesLibrary] = usePersistedState('notesLibrary', [], syncOptions);

  const addNote = useCallback(() => {
    const id = uuid();
    setNotesLibrary((prev) => [
      ...prev,
      { id, title: t('notes.defaultTitle', { n: prev.length + 1 }), content: '', color: null },
    ]);
    return id;
  }, [setNotesLibrary, t]);

  const updateNote = useCallback(
    (id, changes) => {
      setNotesLibrary((prev) => prev.map((n) => (n.id === id ? { ...n, ...changes } : n)));
    },
    [setNotesLibrary]
  );

  const removeNote = useCallback(
    (id) => {
      setNotesLibrary((prev) => prev.filter((n) => n.id !== id));
    },
    [setNotesLibrary]
  );

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
        avatar: null,
        revealed: false,
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

  // --- NPCs (roster compartido, similar a enemigos pero con una bandera
  // isCombat: los de combate se pueden agregar al Tracker de Iniciativa igual
  // que un enemigo; los que no son de combate solo se ven en el NPC Reference
  // con su descripción). ---
  const [npcs, setNpcs] = usePersistedState('npcs', [], syncOptions);

  const addNPC = useCallback(() => {
    setNpcs((prev) => [
      ...prev,
      {
        id: uuid(),
        name: t('npcs.defaultName', { n: prev.length + 1 }),
        color: NPC_COLORS[prev.length % NPC_COLORS.length],
        avatar: null,
        revealed: false,
        isCombat: false,
        description: '',
        ac: 10,
        hpMax: 10,
        speed: '9 m',
        attacks: '',
      },
    ]);
  }, [setNpcs, t]);

  const updateNPC = useCallback(
    (id, changes) => {
      setNpcs((prev) => prev.map((n) => (n.id === id ? { ...n, ...changes } : n)));
    },
    [setNpcs]
  );

  const removeNPC = useCallback(
    (id) => {
      setNpcs((prev) => prev.filter((n) => n.id !== id));
    },
    [setNpcs]
  );

  const addNPCToCombat = useCallback(
    (instanceId, npc) => {
      if (!npc.isCombat) return;
      updateCombatants(instanceId, (prev) => [
        ...prev,
        {
          id: uuid(),
          name: npc.name,
          color: npc.color || NPC_COLORS[0],
          type: 'npc',
          sourceNpcId: npc.id,
          initiative: Math.floor(Math.random() * 20) + 1,
          conditions: [],
          hp: { current: npc.hpMax || 10, max: npc.hpMax || 10 },
          ac: npc.ac,
          notes: [npc.attacks, npc.description].filter(Boolean).join(' — '),
        },
      ]);
    },
    [updateCombatants]
  );

  // --- Compartir dashboard con jugadores (link, sin cuenta). Independiente
  // de la suscripción — ver src/hooks/useShareSync.js. ---
  const { share, shareLoading, refreshShare, updateShareConfig, regenerateShareToken, shareUrl } = useShareSync(
    user.id,
    { players, enemies, npcs }
  );

  useCombatBroadcast({
    isPremium: user.isPremium,
    shareEnabled: Boolean(share?.enabled),
    shareToken: share?.share_token,
    combats,
  });

  // --- Tiradas de salvación contra la muerte: viven sobre cada combatiente
  // (jugador o NPC) dentro de "combats". Se resuelven automáticamente al
  // llegar a 3 éxitos (estabiliza con 1 HP) o 3 fallos (muere). ---
  const recordDeathSave = useCallback(
    (instanceId, combatantId, outcome) => {
      updateCombatants(instanceId, (prev) =>
        prev.map((c) => {
          if (c.id !== combatantId) return c;
          const saves = c.deathSaves || { successes: 0, failures: 0 };
          const nextSaves = { ...saves, [outcome]: Math.min(3, saves[outcome] + 1) };
          if (outcome === 'successes' && nextSaves.successes >= 3) {
            return {
              ...c,
              deathSaves: undefined,
              isDead: false,
              hp: { ...(c.hp || { current: 0, max: 10 }), current: 1 },
            };
          }
          if (outcome === 'failures' && nextSaves.failures >= 3) {
            return { ...c, deathSaves: nextSaves, isDead: true };
          }
          return { ...c, deathSaves: nextSaves };
        })
      );
    },
    [updateCombatants]
  );

  const resetDeathSaves = useCallback(
    (instanceId, combatantId) => {
      updateCombatants(instanceId, (prev) =>
        prev.map((c) => (c.id === combatantId ? { ...c, deathSaves: undefined, isDead: false } : c))
      );
    },
    [updateCombatants]
  );

  // --- Escenas: cada una tiene su propio layout de módulos independiente,
  // para armar distintos conjuntos de widgets según la parte de la historia
  // (ej. "Taberna", "Combate", "Mazmorra") y cambiar entre ellos sin perder
  // nada. Los datos globales (jugadores, enemigos, npcs, loot table) se
  // comparten entre todas las escenas; solo el layout de widgets es propio
  // de cada una. ---
  const [scenes, setScenes] = usePersistedState('scenes', createDefaultScenes, syncOptions);
  const [activeSceneId, setActiveSceneId] = usePersistedState('activeSceneId', null, syncOptions);

  // Si la escena activa persistida ya no existe (se borró, o es la primera
  // carga), cae de vuelta a la primera escena disponible.
  const currentSceneId = scenes.some((s) => s.id === activeSceneId) ? activeSceneId : scenes[0]?.id ?? null;

  const dashboardLayout = useMemo(
    () => scenes.find((s) => s.id === currentSceneId)?.layout ?? [],
    [scenes, currentSceneId]
  );

  const setDashboardLayout = useCallback(
    (updater) => {
      setScenes((prev) =>
        prev.map((s) =>
          s.id === currentSceneId
            ? { ...s, layout: typeof updater === 'function' ? updater(s.layout) : updater }
            : s
        )
      );
    },
    [setScenes, currentSceneId]
  );

  const addScene = useCallback(() => {
    const id = uuid();
    setScenes((prev) => [...prev, { id, name: t('scenes.defaultName', { n: prev.length + 1 }), layout: [] }]);
    setActiveSceneId(id);
  }, [setScenes, setActiveSceneId, t]);

  const renameScene = useCallback(
    (id, name) => {
      setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    },
    [setScenes]
  );

  const removeScene = useCallback(
    (id) => {
      if (scenes.length <= 1) return;
      const sceneToRemove = scenes.find((s) => s.id === id);
      sceneToRemove?.layout.forEach((item) => removeCombat(item.i));
      setScenes((prev) => prev.filter((s) => s.id !== id));
      setActiveSceneId((prev) => (prev === id ? null : prev));
    },
    [scenes, setScenes, removeCombat, setActiveSceneId]
  );

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
      authLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      deleteAccount,
      subscription,
      refreshSubscription,
      cloudFiles,
      refreshCloudFiles,
      storageUsedBytes,
      share,
      shareLoading,
      refreshShare,
      updateShareConfig,
      regenerateShareToken,
      shareUrl,
      isSupabaseConfigured,
      syncOptions,
      players,
      addPlayer,
      updatePlayer,
      removePlayer,
      lootTable,
      setLootTable,
      notesLibrary,
      addNote,
      updateNote,
      removeNote,
      getCombat,
      updateCombatants,
      nextTurn,
      setCombatTurnIndex,
      enemies,
      addEnemy,
      updateEnemy,
      removeEnemy,
      addEnemyToCombat,
      npcs,
      addNPC,
      updateNPC,
      removeNPC,
      addNPCToCombat,
      recordDeathSave,
      resetDeathSaves,
      scenes,
      activeSceneId: currentSceneId,
      setActiveSceneId,
      addScene,
      renameScene,
      removeScene,
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
      authLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      deleteAccount,
      subscription,
      refreshSubscription,
      cloudFiles,
      refreshCloudFiles,
      storageUsedBytes,
      share,
      shareLoading,
      refreshShare,
      updateShareConfig,
      regenerateShareToken,
      shareUrl,
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
      notesLibrary,
      addNote,
      updateNote,
      removeNote,
      enemies,
      addEnemy,
      updateEnemy,
      removeEnemy,
      addEnemyToCombat,
      npcs,
      addNPC,
      updateNPC,
      removeNPC,
      addNPCToCombat,
      recordDeathSave,
      resetDeathSaves,
      scenes,
      currentSceneId,
      setActiveSceneId,
      addScene,
      renameScene,
      removeScene,
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
