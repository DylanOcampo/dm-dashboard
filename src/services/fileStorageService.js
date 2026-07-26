import { v4 as uuid } from 'uuid';
import { supabase } from './supabaseClient';

const BUCKET = 'user-files';
const TABLE = 'user_files';
const SIGNED_URL_TTL_SECONDS = 60 * 10;

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function listUserFiles(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadUserFile({ userId, moduleInstanceId, fileType, file }) {
  const id = uuid();
  const storagePath = `${userId}/${id}-${sanitizeName(file.name)}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from(TABLE)
    .insert({
      id,
      user_id: userId,
      module_instance_id: moduleInstanceId,
      file_name: file.name,
      file_type: fileType,
      size_bytes: file.size,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (insertError) {
    // Si falla el insert (ej. cuota superada), no dejar el blob huérfano en el bucket.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  return data;
}

export async function deleteUserFile(fileRow) {
  await supabase.storage.from(BUCKET).remove([fileRow.storage_path]);
  const { error } = await supabase.from(TABLE).delete().eq('id', fileRow.id);
  if (error) throw error;
}

export async function getSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export function getStorageUsage(files) {
  return files.reduce((total, f) => total + (f.size_bytes || 0), 0);
}
