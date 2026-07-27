import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  getOrCreateShare,
  updateShareConfig as updateShareConfigRemote,
  regenerateShareToken as regenerateShareTokenRemote,
  buildShareUrl,
} from '../services/shareService';

const DEBOUNCE_MS = 600;

/**
 * Mantiene la fila de dm_shares del DM y, mientras esté "enabled", empuja el
 * roster (jugadores completos, enemigos/NPCs solo revealed=true) cada vez
 * que cambian. A propósito NO depende de la suscripción — compartir el link
 * funciona para cualquier DM logueado, solo el envío automático de archivos
 * reales y el combate en vivo están gateados por has_active_subscription.
 */
export function useShareSync(userId, { players, enemies, npcs }) {
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setShare(null);
      return;
    }
    setLoading(true);
    try {
      const row = await getOrCreateShare(userId);
      setShare(row);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateConfig = useCallback(
    async (changes) => {
      if (!userId) return null;
      const row = await updateShareConfigRemote(userId, changes);
      setShare(row);
      return row;
    },
    [userId]
  );

  const regenerateToken = useCallback(async () => {
    if (!userId) return null;
    const row = await regenerateShareTokenRemote(userId);
    setShare(row);
    return row;
  }, [userId]);

  useEffect(() => {
    if (!share?.enabled || !userId) return undefined;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateShareConfigRemote(userId, {
        shared_players: players,
        shared_enemies: enemies.filter((e) => e.revealed),
        shared_npcs: npcs.filter((n) => n.revealed),
      })
        .then(setShare)
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share?.enabled, userId, players, enemies, npcs]);

  return {
    share,
    shareLoading: loading,
    refreshShare: refresh,
    updateShareConfig: updateConfig,
    regenerateShareToken: regenerateToken,
    shareUrl: share ? buildShareUrl(share.share_token) : null,
  };
}
