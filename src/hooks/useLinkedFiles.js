import { useCallback, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { usePersistedState } from './usePersistedState';
import { saveFileEntry, getFileEntry, deleteFileEntry } from '../services/fileHandleStore';
import { uploadUserFile, deleteUserFile, getSignedUrl } from '../services/fileStorageService';

export const isFileSystemAccessSupported =
  typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';

/**
 * Vincula archivos locales del usuario (PDFs, imágenes). Sin suscripción
 * activa se comporta como siempre: en navegadores con File System Access API
 * guarda un handle al archivo en disco; si no, guarda una copia en
 * IndexedDB. Ninguno de los dos sale de este navegador.
 *
 * Con `cloud.enabled` (suscripción activa), en cambio, el contenido real se
 * sube a Supabase Storage (kind: 'cloud') para que el Administrador de
 * Archivos pueda verlo/borrarlo desde cualquier dispositivo. Si la
 * suscripción está inactiva pero ya había archivos en la nube, siguen
 * siendo visibles (solo lectura) pero no se pueden borrar desde acá — ver
 * `cloud.enabled` en `removeFile`.
 */
export function useLinkedFiles(storageKey, { syncOptions, pickerTypes, linkErrorMessage, cloud } = {}) {
  const [files, setFiles] = usePersistedState(storageKey, [], syncOptions);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const addFromHandles = useCallback(
    async (handles) => {
      const newEntries = [];
      for (const handle of handles) {
        const id = uuid();
        // eslint-disable-next-line no-await-in-loop
        await saveFileEntry(id, { kind: 'handle', handle });
        newEntries.push({ id, name: handle.name, kind: 'handle' });
      }
      setFiles((prev) => [...prev, ...newEntries]);
      return newEntries;
    },
    [setFiles]
  );

  const addFromFileList = useCallback(
    async (fileList) => {
      const newEntries = [];
      for (const file of Array.from(fileList)) {
        if (cloud?.enabled) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const row = await uploadUserFile({
              userId: cloud.userId,
              moduleInstanceId: cloud.moduleInstanceId,
              fileType: cloud.fileType,
              file,
            });
            newEntries.push({ id: row.id, name: row.file_name, kind: 'cloud', storagePath: row.storage_path });
          } catch (err) {
            setError(err.message?.includes('quota') || err.message?.includes('Storage quota')
              ? cloud.quotaExceededMessage || 'Superaste tu límite de almacenamiento.'
              : linkErrorMessage || 'No se pudo subir el archivo.');
          }
        } else {
          const id = uuid();
          // eslint-disable-next-line no-await-in-loop
          await saveFileEntry(id, { kind: 'blob', blob: file });
          newEntries.push({ id, name: file.name, kind: 'blob' });
        }
      }
      if (newEntries.length > 0) {
        setFiles((prev) => [...prev, ...newEntries]);
        cloud?.onFilesChanged?.();
      }
      return newEntries;
    },
    [setFiles, cloud, linkErrorMessage]
  );

  const pickFiles = useCallback(async () => {
    setError('');
    if (cloud?.enabled) {
      fileInputRef.current?.click();
      return;
    }
    if (isFileSystemAccessSupported) {
      try {
        const handles = await window.showOpenFilePicker({ multiple: true, types: pickerTypes });
        await addFromHandles(handles);
      } catch (err) {
        if (err?.name !== 'AbortError') setError(linkErrorMessage || 'Could not link the file.');
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [addFromHandles, pickerTypes, linkErrorMessage, cloud]);

  const handleFileInputChange = useCallback(
    async (e) => {
      if (e.target.files?.length) {
        await addFromFileList(e.target.files);
      }
      e.target.value = '';
    },
    [addFromFileList]
  );

  const removeFile = useCallback(
    async (id) => {
      const entry = files.find((f) => f.id === id);
      if (entry?.kind === 'cloud') {
        if (!cloud?.enabled) {
          setError(cloud?.inactiveMessage || 'Tu suscripción está inactiva: los archivos en la nube son de solo lectura.');
          return;
        }
        try {
          await deleteUserFile(entry);
        } catch (err) {
          setError(linkErrorMessage || 'No se pudo eliminar el archivo.');
          return;
        }
        cloud?.onFilesChanged?.();
      } else {
        deleteFileEntry(id);
      }
      setFiles((prev) => prev.filter((f) => f.id !== id));
    },
    [setFiles, files, cloud, linkErrorMessage]
  );

  const resolveObjectUrl = useCallback(
    async (id, { requestIfNeeded = false } = {}) => {
      const meta = files.find((f) => f.id === id);
      if (meta?.kind === 'cloud') {
        try {
          const url = await getSignedUrl(meta.storagePath);
          return { url, needsPermission: false };
        } catch {
          return { url: null, needsPermission: false, missing: true };
        }
      }

      const entry = await getFileEntry(id);
      if (!entry) return { url: null, needsPermission: false, missing: true };

      if (entry.kind === 'blob') {
        return { url: URL.createObjectURL(entry.blob), needsPermission: false };
      }

      try {
        let permission = await entry.handle.queryPermission({ mode: 'read' });
        if (permission !== 'granted' && requestIfNeeded) {
          permission = await entry.handle.requestPermission({ mode: 'read' });
        }
        if (permission !== 'granted') {
          return { url: null, needsPermission: true };
        }
        const file = await entry.handle.getFile();
        return { url: URL.createObjectURL(file), needsPermission: false };
      } catch {
        return { url: null, needsPermission: true };
      }
    },
    [files]
  );

  return {
    files,
    error,
    pickFiles,
    removeFile,
    resolveObjectUrl,
    fileInputRef,
    handleFileInputChange,
    isFileSystemAccessSupported,
  };
}
