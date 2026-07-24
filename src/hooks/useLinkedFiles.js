import { useCallback, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { usePersistedState } from './usePersistedState';
import { saveFileEntry, getFileEntry, deleteFileEntry } from '../services/fileHandleStore';

export const isFileSystemAccessSupported =
  typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';

/**
 * Vincula archivos locales del usuario (PDFs, imágenes) sin subirlos a ningún
 * servidor. En navegadores con File System Access API (Chrome/Edge) se guarda
 * un handle que apunta al archivo original en disco (el usuario debe mantenerlo
 * en el mismo lugar); en otros navegadores se guarda una copia del archivo en
 * IndexedDB como respaldo. Solo el nombre/id se persiste (y sincroniza) como
 * metadata; el contenido del archivo nunca sale de este navegador.
 */
export function useLinkedFiles(storageKey, { syncOptions, pickerTypes } = {}) {
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
        const id = uuid();
        // eslint-disable-next-line no-await-in-loop
        await saveFileEntry(id, { kind: 'blob', blob: file });
        newEntries.push({ id, name: file.name, kind: 'blob' });
      }
      setFiles((prev) => [...prev, ...newEntries]);
      return newEntries;
    },
    [setFiles]
  );

  const pickFiles = useCallback(async () => {
    setError('');
    if (isFileSystemAccessSupported) {
      try {
        const handles = await window.showOpenFilePicker({ multiple: true, types: pickerTypes });
        await addFromHandles(handles);
      } catch (err) {
        if (err?.name !== 'AbortError') setError('No se pudo vincular el archivo.');
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [addFromHandles, pickerTypes]);

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
    (id) => {
      deleteFileEntry(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    },
    [setFiles]
  );

  const resolveObjectUrl = useCallback(async (id, { requestIfNeeded = false } = {}) => {
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
  }, []);

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
