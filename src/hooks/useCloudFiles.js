import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { listUserFiles, getStorageUsage } from '../services/fileStorageService';

/**
 * Lista los archivos que el usuario subió a Supabase Storage (tabla
 * `user_files`). La consumen tanto el Administrador de Archivos como
 * AppContext (para mostrar el uso de almacenamiento en Mi Cuenta).
 */
export function useCloudFiles(userId) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    try {
      const data = await listUserFiles(userId);
      setFiles(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const storageUsedBytes = getStorageUsage(files);

  return { files, loading, refresh, storageUsedBytes };
}
