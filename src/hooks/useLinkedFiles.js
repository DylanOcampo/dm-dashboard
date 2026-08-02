import { useCallback, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { usePersistedState } from './usePersistedState';
import { saveFileEntry, getFileEntry, deleteFileEntry } from '../services/fileHandleStore';
import { uploadUserFile, deleteUserFile, getSignedUrl } from '../services/fileStorageService';

export const isFileSystemAccessSupported =
  typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

// El módulo combinado (FileViewer) solo soporta PDFs e imágenes — el tipo se
// detecta por archivo (MIME, con fallback a la extensión) en vez de venir
// fijo por instancia, así una misma lista puede tener de ambos.
function detectFileType(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name)) return 'image';
  return null;
}

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
export function useLinkedFiles(storageKey, { syncOptions, pickerTypes, linkErrorMessage, unsupportedTypeMessage, cloud } = {}) {
  const [files, setFiles] = usePersistedState(storageKey, [], syncOptions);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const addFromHandles = useCallback(
    async (handles) => {
      const newEntries = [];
      let hadUnsupported = false;
      for (const handle of handles) {
        // eslint-disable-next-line no-await-in-loop
        const file = await handle.getFile();
        const fileType = detectFileType(file);
        if (!fileType) {
          hadUnsupported = true;
          continue;
        }
        const id = uuid();
        // eslint-disable-next-line no-await-in-loop
        await saveFileEntry(id, { kind: 'handle', handle });
        newEntries.push({ id, name: handle.name, kind: 'handle', fileType });
      }
      if (hadUnsupported) {
        setError(unsupportedTypeMessage || 'Solo se pueden vincular PDFs o imágenes.');
      }
      if (newEntries.length > 0) setFiles((prev) => [...prev, ...newEntries]);
      return newEntries;
    },
    [setFiles, unsupportedTypeMessage]
  );

  const addFromFileList = useCallback(
    async (fileList) => {
      const newEntries = [];
      let hadUnsupported = false;
      for (const file of Array.from(fileList)) {
        const fileType = detectFileType(file);
        if (!fileType) {
          hadUnsupported = true;
          continue;
        }
        if (cloud?.enabled) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const row = await uploadUserFile({
              userId: cloud.userId,
              moduleInstanceId: cloud.moduleInstanceId,
              fileType,
              file,
            });
            newEntries.push({ id: row.id, name: row.file_name, kind: 'cloud', storagePath: row.storage_path, fileType });
          } catch (err) {
            setError(err.message?.includes('quota') || err.message?.includes('Storage quota')
              ? cloud.quotaExceededMessage || 'Superaste tu límite de almacenamiento.'
              : linkErrorMessage || 'No se pudo subir el archivo.');
          }
        } else {
          const id = uuid();
          // eslint-disable-next-line no-await-in-loop
          await saveFileEntry(id, { kind: 'blob', blob: file });
          newEntries.push({ id, name: file.name, kind: 'blob', fileType });
        }
      }
      if (hadUnsupported) {
        setError(unsupportedTypeMessage || 'Solo se pueden vincular PDFs o imágenes.');
      }
      if (newEntries.length > 0) {
        setFiles((prev) => [...prev, ...newEntries]);
        cloud?.onFilesChanged?.();
      }
      return newEntries;
    },
    [setFiles, cloud, linkErrorMessage, unsupportedTypeMessage]
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
