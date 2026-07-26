import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const EMPTY_USER = { id: null, email: null, isAuthenticated: false };

function userFromSession(session) {
  if (!session?.user) return EMPTY_USER;
  return { id: session.user.id, email: session.user.email, isAuthenticated: true };
}

/**
 * Autenticación real con Supabase Auth (email + contraseña). Reemplaza al
 * login mock que antes vivía en AppContext.js (solo pedía un email, sin
 * verificar nada).
 */
export function useAuth() {
  const [user, setUser] = useState(EMPTY_USER);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setUser(userFromSession(data.session));
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(userFromSession(session));
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const requireSupabase = useCallback(() => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase no está configurado (faltan REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY).');
    }
  }, []);

  const signUp = useCallback(
    async (email, password) => {
      requireSupabase();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    [requireSupabase]
  );

  const signIn = useCallback(
    async (email, password) => {
      requireSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    [requireSupabase]
  );

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setUser(EMPTY_USER);
  }, []);

  const resetPassword = useCallback(
    async (email) => {
      requireSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
    [requireSupabase]
  );

  return { user, authLoading, signUp, signIn, signOut, resetPassword };
}
