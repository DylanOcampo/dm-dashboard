import { useCallback, useEffect, useRef, useState } from 'react';
import { readLocal, writeLocal, readRemote, writeRemote } from '../services/storageService';

/**
 * Estado persistido en localStorage siempre, y adicionalmente sincronizado
 * con Supabase cuando syncEnabled es true y hay un userId (usuario logueado
 * + con suscripción activa). Si existen datos remotos al activarse el sync,
 * estos tienen prioridad sobre lo local (la nube es la fuente de verdad de
 * la sesión del usuario pagado).
 */
export function usePersistedState(key, defaultValue, { syncEnabled = false, userId = null } = {}) {
  const [state, setState] = useState(() => {
    const resolvedDefault = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    return readLocal(key, resolvedDefault);
  });
  const hydratedFromRemote = useRef(false);

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
          writeRemote(key, userId, next);
        }
        return next;
      });
    },
    [key, syncEnabled, userId]
  );

  return [state, update];
}
