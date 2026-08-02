import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLinkedFiles } from '../../hooks/useLinkedFiles';
import { usePlayerSession } from '../PlayerSessionContext';
import { getSharedFiles, getSharedFileUrl } from '../../services/shareService';
import '../../components/modules/FileViewer/FileViewer.css';

const FILE_PICKER_TYPES = [
  {
    description: 'PDF o imagen',
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'],
    },
  },
];

function resolveFileType(entry, moduleType) {
  if (entry.fileType) return entry.fileType;
  if (moduleType === 'image') return 'image';
  if (moduleType === 'pdf') return 'pdf';
  return /\.pdf$/i.test(entry.name) ? 'pdf' : 'image';
}

export default function PlayerFileViewer({ instanceId, moduleType }) {
  const { syncOptions, t } = useApp();
  const { token } = usePlayerSession();
  const [sharedFiles, setSharedFiles] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSharedLoading(true);
    getSharedFiles(token)
      .then((allFiles) => {
        if (!cancelled) setSharedFiles(allFiles);
      })
      .catch(() => {
        if (!cancelled) setSharedFiles([]);
      })
      .finally(() => {
        if (!cancelled) setSharedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const { files, error, pickFiles, removeFile, resolveObjectUrl, fileInputRef, handleFileInputChange, isFileSystemAccessSupported } =
    useLinkedFiles(storageKeyFor(moduleType, instanceId), {
      syncOptions,
      pickerTypes: FILE_PICKER_TYPES,
      linkErrorMessage: t('fileViewer.linkErrorGeneric'),
      unsupportedTypeMessage: t('fileViewer.unsupportedType'),
    });

  // activeId puede ser el id de un archivo compartido (tabla user_files) o
  // de un archivo local (useLinkedFiles) — son ambos uuid, no colisionan.
  const [activeId, setActiveId] = useState(null);
  const [activeIsShared, setActiveIsShared] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);

  // Auto-selecciona el primer archivo disponible (priorizando los que
  // compartió el DM) apenas hay algo para mostrar, sin esperar un click.
  useEffect(() => {
    if (sharedLoading) return;
    const stillValid = activeIsShared
      ? sharedFiles.some((f) => f.id === activeId)
      : files.some((f) => f.id === activeId);
    if (activeId && stillValid) return;
    if (sharedFiles.length > 0) {
      setActiveId(sharedFiles[0].id);
      setActiveIsShared(true);
    } else if (files.length > 0) {
      setActiveId(files[0].id);
      setActiveIsShared(false);
    } else {
      setActiveId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedFiles, files, sharedLoading]);

  useEffect(() => {
    let currentUrl = null;
    let cancelled = false;
    setObjectUrl(null);
    if (!activeId) return undefined;
    if (activeIsShared) {
      getSharedFileUrl(token, activeId).then((url) => {
        if (!cancelled) setObjectUrl(url);
      });
      // ignorar el error: el archivo pudo haber sido des-compartido en el medio
    } else {
      resolveObjectUrl(activeId).then((res) => {
        if (cancelled || !res?.url) return;
        currentUrl = res.url;
        setObjectUrl(res.url);
      });
    }
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [activeId, activeIsShared, token, resolveObjectUrl]);

  const activeSharedFile = activeIsShared ? sharedFiles.find((f) => f.id === activeId) : null;
  const activeLocalFile = !activeIsShared ? files.find((f) => f.id === activeId) : null;
  const activeName = activeSharedFile?.file_name ?? activeLocalFile?.name;
  const activeType = activeSharedFile
    ? activeSharedFile.file_type
    : activeLocalFile
      ? resolveFileType(activeLocalFile, moduleType)
      : null;

  return (
    <div className="file-viewer">
      {sharedFiles.length > 0 && (
        <div className="file-viewer__files">
          {sharedFiles.map((f) => (
            <div
              key={f.id}
              className={`file-viewer__file-chip ${activeIsShared && f.id === activeId ? 'is-active' : ''}`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveIsShared(true);
                  setActiveId(f.id);
                }}
                title={f.file_name}
              >
                ☁️ {f.file_type === 'pdf' ? '📄' : '🖼️'} {f.file_name}
              </button>
            </div>
          ))}
        </div>
      )}

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

      {files.length > 0 && (
        <div className="file-viewer__files">
          {files.map((f) => (
            <div
              key={f.id}
              className={`file-viewer__file-chip ${!activeIsShared && f.id === activeId ? 'is-active' : ''}`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveIsShared(false);
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
                aria-label={t('fileViewer.removeFileAria', { name: f.name })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="file-viewer__content">
        {files.length === 0 && sharedFiles.length === 0 && <p className="file-viewer__empty">{t('fileViewer.empty')}</p>}
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

function storageKeyFor(moduleType, instanceId) {
  if (moduleType === 'image') return `imageLinks:${instanceId}`;
  if (moduleType === 'pdf') return `pdfLinks:${instanceId}`;
  return `fileLinks:${instanceId}`;
}
