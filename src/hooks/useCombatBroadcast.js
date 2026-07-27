import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const DEBOUNCE_MS = 250;

/**
 * DM-side: retransmite `combats` en vivo por Supabase Realtime Broadcast en
 * el canal `dm-share:<token>`, únicamente cuando el DM tiene suscripción
 * activa y el share está habilitado. El jugador se suscribe al mismo canal
 * sin login (ver src/player/PlayerSessionContext.js). No usa ninguna tabla
 * nueva — es puro pub/sub efímero.
 */
export function useCombatBroadcast({ isPremium, shareEnabled, shareToken, combats }) {
  const channelRef = useRef(null);
  const subscribedRef = useRef(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !isPremium || !shareEnabled || !shareToken) {
      return undefined;
    }
    const channel = supabase.channel(`dm-share:${shareToken}`);
    channel.subscribe((status) => {
      subscribedRef.current = status === 'SUBSCRIBED';
    });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      subscribedRef.current = false;
    };
  }, [isPremium, shareEnabled, shareToken]);

  useEffect(() => {
    if (!channelRef.current) return undefined;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (subscribedRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'combats', payload: combats });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [combats]);
}
