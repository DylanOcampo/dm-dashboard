import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { AppContext } from '../context/AppContext';
import { getSharedSnapshot } from '../services/shareService';
import { readLocal, writeLocal } from '../services/storageService';
import { usePersistedState } from '../hooks/usePersistedState';
import { translate, DEFAULT_LANGUAGE } from '../i18n/language';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const LOCAL_ONLY_SYNC = { syncEnabled: false, userId: null };

const PlayerSessionContext = createContext(null);

export const SPECTATOR_ID = '__spectator__';

function layoutKey(token) {
  return `playerLayout:${token}`;
}
function identityKey(token) {
  return `playerIdentity:${token}`;
}
function langKey(token) {
  return `playerLanguage:${token}`;
}

function buildLayoutFromTypes(types) {
  return (types || []).map((type, idx) => ({
    i: uuid(),
    type,
    x: (idx % 3) * 4,
    y: Math.floor(idx / 3) * 6,
    w: 4,
    h: 6,
    minW: 3,
    minH: 3,
  }));
}

/**
 * Sesión del jugador: carga el snapshot público (get_shared_snapshot vía
 * shareService), la identidad elegida, y un dashboard plano 100% local
 * (localStorage, sin cuenta). También renderiza <AppContext.Provider> con
 * un value mínimo para reusar Time/Music/Notes/Dice/Soundboard/Calculator
 * sin forkearlos (ver context/AppContext.js).
 */
export function PlayerSessionProvider({ token, children }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [identityId, setIdentityId] = useState(() => readLocal(identityKey(token), null));
  const [language, setLanguageState] = useState(() => readLocal(langKey(token), DEFAULT_LANGUAGE));
  const [layout, setLayout] = useState(() => readLocal(layoutKey(token), null));
  const [liveCombats, setLiveCombats] = useState(null);

  // Combate en vivo (Realtime Broadcast, ver hooks/useCombatBroadcast.js del
  // lado DM): sin login, se suscribe con la anon key. Si el DM no tiene
  // suscripción activa o no está compartiendo, simplemente no llegan mensajes.
  useEffect(() => {
    if (!isSupabaseConfigured || !token) return undefined;
    const channel = supabase
      .channel(`dm-share:${token}`)
      .on('broadcast', { event: 'combats' }, (msg) => setLiveCombats(msg.payload))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [token]);

  const liveCombat = useMemo(() => {
    const values = liveCombats ? Object.values(liveCombats) : [];
    return values[0] || null;
  }, [liveCombats]);

  const t = useCallback((key, vars) => translate(language, key, vars), [language]);

  // Notas del jugador: 100% locales a su navegador (nunca se sincronizan
  // con el DM ni con otros jugadores), separadas por token para no
  // pisarse con la biblioteca de notas del propio DM si comparten navegador.
  const [notesLibrary, setNotesLibrary] = usePersistedState(`notesLibrary:${token}`, [], LOCAL_ONLY_SYNC);

  const addNote = useCallback(() => {
    const id = uuid();
    setNotesLibrary((prev) => [
      ...prev,
      { id, title: translate(language, 'notes.defaultTitle', { n: prev.length + 1 }), content: '', color: null },
    ]);
    return id;
  }, [setNotesLibrary, language]);

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

  const setLanguage = useCallback(
    (lang) => {
      setLanguageState(lang);
      writeLocal(langKey(token), lang);
    },
    [token]
  );

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSharedSnapshot(token);
      if (!data) {
        setError('notFound');
        setSnapshot(null);
      } else if (!data.enabled) {
        setError('disabled');
        setSnapshot(null);
      } else {
        setSnapshot(data);
      }
    } catch {
      setError('notFound');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const setIdentity = useCallback(
    (id) => {
      setIdentityId(id);
      writeLocal(identityKey(token), id);
    },
    [token]
  );

  const setPlayerLayout = useCallback(
    (updater) => {
      setLayout((prev) => {
        const base = prev || [];
        const next = typeof updater === 'function' ? updater(base) : updater;
        writeLocal(layoutKey(token), next);
        return next;
      });
    },
    [token]
  );

  const addModuleInstance = useCallback(
    (type) => {
      setPlayerLayout((prev) => {
        const maxY = prev.reduce((acc, item) => Math.max(acc, item.y + item.h), 0);
        return [...prev, { i: uuid(), type, x: 0, y: maxY, w: 4, h: 6, minW: 3, minH: 3 }];
      });
    },
    [setPlayerLayout]
  );

  const removeModuleInstance = useCallback(
    (instanceId) => {
      setPlayerLayout((prev) => prev.filter((item) => item.i !== instanceId));
    },
    [setPlayerLayout]
  );

  const toggleModuleMinimized = useCallback(
    (instanceId) => {
      setPlayerLayout((prev) =>
        prev.map((item) => {
          if (item.i !== instanceId) return item;
          if (item.minimized) {
            return { ...item, minimized: false, h: item.prevH ?? item.h, prevH: undefined };
          }
          return { ...item, minimized: true, prevH: item.h, h: 2 };
        })
      );
    },
    [setPlayerLayout]
  );

  // Primera vez que entra (sin layout guardado todavía): arranca ya armado
  // con el set de módulos que el DM habilitó.
  useEffect(() => {
    if (snapshot && layout === null) {
      setPlayerLayout(buildLayoutFromTypes(snapshot.shared_module_types));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  // Botón "Sincronizar": trae el snapshot más reciente y resetea el layout
  // por completo al set de módulos habilitado ahora mismo (tal cual lo pide
  // el DM — no es un merge).
  const syncDashboard = useCallback(async () => {
    const fresh = await getSharedSnapshot(token);
    if (fresh) setSnapshot(fresh);
    setPlayerLayout(buildLayoutFromTypes(fresh?.shared_module_types ?? snapshot?.shared_module_types));
  }, [token, snapshot, setPlayerLayout]);

  const selectedPlayer = useMemo(
    () => (snapshot?.shared_players || []).find((p) => p.id === identityId) || null,
    [snapshot, identityId]
  );

  const compatValue = useMemo(
    () => ({ t, language, setLanguage, syncOptions: LOCAL_ONLY_SYNC, notesLibrary, addNote, updateNote, removeNote }),
    [t, language, setLanguage, notesLibrary, addNote, updateNote, removeNote]
  );

  const value = useMemo(
    () => ({
      token,
      snapshot,
      loading,
      error,
      t,
      language,
      setLanguage,
      identityId,
      selectedPlayer,
      setIdentity,
      layout: layout || [],
      setPlayerLayout,
      addModuleInstance,
      removeModuleInstance,
      toggleModuleMinimized,
      syncDashboard,
      refresh: loadSnapshot,
      liveCombat,
    }),
    [
      token,
      snapshot,
      loading,
      error,
      t,
      language,
      setLanguage,
      identityId,
      selectedPlayer,
      setIdentity,
      layout,
      setPlayerLayout,
      addModuleInstance,
      removeModuleInstance,
      toggleModuleMinimized,
      syncDashboard,
      loadSnapshot,
      liveCombat,
    ]
  );

  return (
    <PlayerSessionContext.Provider value={value}>
      <AppContext.Provider value={compatValue}>{children}</AppContext.Provider>
    </PlayerSessionContext.Provider>
  );
}

export function usePlayerSession() {
  const ctx = useContext(PlayerSessionContext);
  if (!ctx) throw new Error('usePlayerSession debe usarse dentro de <PlayerSessionProvider>');
  return ctx;
}
