import { supabase, isSupabaseConfigured } from './supabaseClient';

const PREFIX = 'dmDashboard:';
const TABLE = 'dashboard_data';

export function readLocal(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`No se pudo leer "${key}" de localStorage`, err);
    return fallback;
  }
}

export function writeLocal(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn(`No se pudo guardar "${key}" en localStorage`, err);
  }
}

export async function readRemote(key, userId) {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .eq('user_id', userId)
      .eq('data_key', key)
      .maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  } catch (err) {
    console.warn(`No se pudo leer "${key}" de Supabase`, err);
    return null;
  }
}

export async function writeRemote(key, userId, value) {
  if (!isSupabaseConfigured || !userId) return;
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { user_id: userId, data_key: key, data: value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,data_key' }
      );
    if (error) throw error;
  } catch (err) {
    console.warn(`No se pudo sincronizar "${key}" con Supabase`, err);
  }
}
