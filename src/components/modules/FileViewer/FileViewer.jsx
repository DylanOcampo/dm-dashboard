import { useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useLinkedFiles } from '../../../hooks/useLinkedFiles';
import { getSignedUrl, deleteUserFile } from '../../../services/fileStorageService';
import './FileViewer.css';

const FILE_PICKER_TYPES = [
  {
    description: 'PDF o imagen',
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'],
    },
  },
];

// Legado: instancias creadas antes de unificar PDF/Imagen en un solo módulo
// no guardaron `fileType` por archivo (todos eran del mismo tipo, fijo por
// el propio widget). `moduleType` es 'pdf'/'image' para esas instancias
// viejas (ver Dashboard.jsx) y sirve de fallback acá.
function resolveFileType(entry, moduleType) {
  if (entry.fileType) return entry.fileType;
  if (moduleType === 'image') return 'image';
  if (moduleType === 'pdf') return 'pdf';
  return /\.pdf$/i.test(entry.name) ? 'pdf' : 'image';
}

export default function FileViewer({ instanceId, moduleType }) {
  const { syncOptions, t, user, cloudFiles, refreshCloudFiles } = useApp();
  const {
    files: rawFiles,
    error,
    pickFiles,
    removeFile,
    resolveObjectUrl,
    fileInputRef,
    handleFileInputChange,
    isFileSystemAccessSupported,
  } = useLinkedFiles(storageKeyFor(moduleType, instanceId), {
    syncOptions,
    pickerTypes: FILE_PICKER_TYPES,
    linkErrorMessage: t('fileViewer.linkErrorGeneric'),
    unsupportedTypeMessage: t('fileViewer.unsupportedType'),
    cloud: {
      enabled: user.isPremium,
      userId: user.id,
      moduleInstanceId: instanceId,
      onFilesChanged: refreshCloudFiles,
      inactiveMessage: t('fileViewer.cloudInactiveMessage'),
      quotaExceededMessage: t('fileViewer.quotaExceeded'),
    },
  });

  // Si borraron este archivo desde OTRO widget (misma nube, ver libraryFiles
  // abajo), la propia lista de este widget puede quedar con una referencia
  // fantasma — se filtra acá para que no aparezca un chip roto.
  const files = rawFiles.filter((f) => f.kind !== 'cloud' || cloudFiles.some((cf) => cf.id === f.id));

  // Todo lo que subiste desde cualquier widget de Archivos (mismo inventario
  // que "Mis Archivos"), menos lo que este widget ya tiene en su propia
  // lista — así cualquier visor puede mostrar cualquier archivo subido,
  // no solo los que se vincularon desde acá.
  const libraryFiles = cloudFiles.filter((cf) => !files.some((f) => f.kind === 'cloud' && f.id === cf.id));

  const [activeId, setActiveId] = useState(null);
  const [activeIsLibrary, setActiveIsLibrary] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [libraryError, setLibraryError] = useState('');

  useEffect(() => {
    const stillValid = activeIsLibrary
      ? libraryFiles.some((f) => f.id === activeId)
      : files.some((f) => f.id === activeId);
    if (activeId && stillValid) return;
    if (files.length > 0) {
      setActiveId(files[0].id);
      setActiveIsLibrary(false);
    } else if (libraryFiles.length > 0) {
      setActiveId(libraryFiles[0].id);
      setActiveIsLibrary(true);
    } else {
      setActiveId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, libraryFiles]);

  useEffect(() => {
    let currentUrl = null;
    let cancelled = false;
    setObjectUrl(null);
    setNeedsPermission(false);
    if (!activeId) return undefined;
    if (activeIsLibrary) {
      const libraryFile = libraryFiles.find((f) => f.id === activeId);
      if (!libraryFile) return undefined;
      getSignedUrl(libraryFile.storage_path).then((url) => {
        if (!cancelled) setObjectUrl(url);
      });
    } else {
      resolveObjectUrl(activeId).then((res) => {
        if (cancelled) return;
        if (res?.url) {
          currentUrl = res.url;
          setObjectUrl(res.url);
        } else if (res?.needsPermission) {
          setNeedsPermission(true);
        }
      });
    }
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeIsLibrary, resolveObjectUrl]);

  const grantAccess = async () => {
    const res = await resolveObjectUrl(activeId, { requestIfNeeded: true });
    if (res?.url) {
      setObjectUrl(res.url);
      setNeedsPermission(false);
    }
  };

  const handleDeleteLibraryFile = async (file) => {
    if (!user.isPremium) return;
    if (!window.confirm(t('fileManager.deleteConfirm', { name: file.file_name }))) return;
    setLibraryError('');
    try {
      await deleteUserFile(file);
      await refreshCloudFiles();
    } catch {
      setLibraryError(t('fileManager.deleteError'));
    }
  };

  const activeOwnFile = !activeIsLibrary ? files.find((f) => f.id === activeId) : null;
  const activeLibraryFile = activeIsLibrary ? libraryFiles.find((f) => f.id === activeId) : null;
  const activeName = activeOwnFile?.name ?? activeLibraryFile?.file_name;
  const activeType = activeOwnFile
    ? resolveFileType(activeOwnFile, moduleType)
    : activeLibraryFile?.file_type ?? null;

  return (
    <div className="file-viewer">
      <div className="file-viewer__toolbar">
        <button type="button" onClick={pickFiles}>
          {t('fileViewer.linkButton')}
        </button>
        <input
          type="file"
          accept="application/pdf,image/*"
          multiple
          ref={fileInputRef}
          className="file-viewer__hidden-input"
          onChange={handleFileInputChange}
        />
        {!isFileSystemAccessSupported && <span className="file-viewer__hint">{t('fileViewer.localCopyHint')}</span>}
      </div>
      {error && <p className="file-viewer__error">{error}</p>}
      {libraryError && <p className="file-viewer__error">{libraryError}</p>}

      {libraryFiles.length > 0 && (
        <div className="file-viewer__files">
          {libraryFiles.map((f) => (
            <div key={f.id} className={`file-viewer__file-chip ${activeIsLibrary && f.id === activeId ? 'is-active' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  setActiveIsLibrary(true);
                  setActiveId(f.id);
                }}
                title={f.file_name}
              >
                ☁️ {f.file_type === 'pdf' ? '📄' : '🖼️'} {f.file_name}
              </button>
              <button
                type="button"
                className="file-viewer__file-remove"
                onClick={() => handleDeleteLibraryFile(f)}
                disabled={!user.isPremium}
                aria-label={t('fileViewer.removeFileAria', { name: f.file_name })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="file-viewer__files">
          {files.map((f) => (
            <div key={f.id} className={`file-viewer__file-chip ${!activeIsLibrary && f.id === activeId ? 'is-active' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  setActiveIsLibrary(false);
                  setActiveId(f.id);
                }}
                title={f.name}
              >
                {resolveFileType(f, moduleType) === 'pdf' ? '📄' : '🖼️'} {f.name}
              </button>
              <button
                type="button"
                className="file-viewer__file-remove"
                onClick={() => removeFile(f.id)}
                disabled={f.kind === 'cloud' && !user.isPremium}
                aria-label={t('fileViewer.removeFileAria', { name: f.name })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="file-viewer__content">
        {files.length === 0 && libraryFiles.length === 0 && <p className="file-viewer__empty">{t('fileViewer.empty')}</p>}
        {files.length > 0 && needsPermission && (
          <div className="file-viewer__permission">
            <p>{t('fileViewer.permissionNeeded')}</p>
            <button type="button" onClick={grantAccess}>
              {t('fileViewer.grantAccessButton')}
            </button>
          </div>
        )}
        {objectUrl && activeType === 'pdf' && (
          <embed src={objectUrl} type="application/pdf" className="file-viewer__embed" title="PDF" />
        )}
        {objectUrl && activeType === 'image' && (
          <img src={objectUrl} alt={activeName} className="file-viewer__image" />
        )}
      </div>
    </div>
  );
}

// Reusa la lista ya guardada de las instancias viejas (pdf/image) en vez de
// arrancar en blanco; las instancias nuevas ('files') usan su propia key.
function storageKeyFor(moduleType, instanceId) {
  if (moduleType === 'image') return `imageLinks:${instanceId}`;
  if (moduleType === 'pdf') return `pdfLinks:${instanceId}`;
  return `fileLinks:${instanceId}`;
}
