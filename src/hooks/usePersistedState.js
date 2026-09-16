import { useCallback, useEffect, useRef, useState } from 'react';
import { readLocal, writeLocal, readRemote, writeRemote } from '../services/storageService';

const REMOTE_SYNC_DEBOUNCE_MS = 500;

/**
 * Estado persistido en localStorage siempre, y adicionalmente sincronizado
 * con Supabase cuando syncEnabled es true y hay un userId (usuario logueado
 * + con suscripción activa). Si existen datos remotos al activarse el sync,
 * estos tienen prioridad sobre lo local (la nube es la fuente de verdad de
 * la sesión del usuario pagado). La escritura remota se debouncea para no
 * saturar Supabase en interacciones rápidas (drag, tipeo); el último valor
 * pendiente se vuelca igual al desmontar para no perder la última edición.
 */
export function usePersistedState(key, defaultValue, { syncEnabled = false, userId = null } = {}) {
  const [state, setState] = useState(() => {
    const resolvedDefault = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    return readLocal(key, resolvedDefault);
  });
  const hydratedFromRemote = useRef(false);
  const debounceTimerRef = useRef(null);
  const pendingRemoteRef = useRef(null);

  useEffect(() => {
    if (!syncEnabled || !userId || hydratedFromRemote.current) return;
    let cancelled = false;
    readRemote(key, userId).then((remoteValue) => {
      if (cancelled || remoteValue === null || remoteValue === undefined) return;
      hydratedFromRemote.current = true;
      setState(remoteValue);
      writeLocal(key, remoteValue);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled, userId, key]);

  const update = useCallback(
    (valueOrUpdater) => {
      setState((prev) => {
        const next =
          typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
        writeLocal(key, next);
        if (syncEnabled && userId) {
          pendingRemoteRef.current = { key, userId, value: next };
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            const pending = pendingRemoteRef.current;
            pendingRemoteRef.current = null;
            if (pending) writeRemote(pending.key, pending.userId, pending.value);
          }, REMOTE_SYNC_DEBOUNCE_MS);
        }
        return next;
      });
    },
    [key, syncEnabled, userId]
  );

  // Vuelca cualquier escritura remota pendiente al desmontar (ej. el usuario
  // cambia de módulo justo después de escribir), en vez de dejarla perdida
  // cuando el timeout de debounce nunca llega a dispararse.
  useEffect(
    () => () => {
      clearTimeout(debounceTimerRef.current);
      const pending = pendingRemoteRef.current;
      pendingRemoteRef.current = null;
      if (pending) writeRemote(pending.key, pending.userId, pending.value);
    },
    []
  );

  return [state, update];
}
