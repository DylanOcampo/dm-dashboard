import { supabase } from './supabaseClient';

const TABLE = 'dm_shares';

export async function getOrCreateShare(userId) {
  const { data: existing, error: selectError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from(TABLE)
    .insert({ user_id: userId })
    .select()
    .single();
  if (insertError) throw insertError;
  return created;
}

export async function updateShareConfig(userId, changes) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function regenerateShareToken(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ share_token: crypto.randomUUID(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function buildShareUrl(token) {
  return `${window.location.origin}${window.location.pathname}?play=${token}`;
}

export async function getSharedSnapshot(token) {
  const { data, error } = await supabase.rpc('get_shared_snapshot', { token });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getSharedFiles(token) {
  const { data, error } = await supabase.rpc('get_shared_files', { token });
  if (error) throw error;
  return data ?? [];
}

export async function getSharedFileUrl(token, fileId) {
  const { data, error } = await supabase.functions.invoke('get-shared-file-url', {
    body: { token, fileId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.url;
}
