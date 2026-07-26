import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

/**
 * Trae la fila de `subscriptions` del usuario actual. La escriben
 * únicamente las Edge Functions (service_role) al procesar eventos de
 * Stripe — acá solo se lee. `refresh()` se llama a mano después de volver
 * de Stripe Checkout/Billing Portal, ya que no hay forma de que el cliente
 * sepa en el momento que el webhook ya corrió.
 */
export function useSubscription(userId) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
    setSubscription(data ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { subscription, loading, refresh };
}
