import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLinkedFiles } from '../../hooks/useLinkedFiles';
import { usePlayerSession } from '../PlayerSessionContext';
import { getSharedFiles, getSharedFileUrl } from '../../services/shareService';
import '../../components/modules/PDFViewer/PDFViewer.css';

const PDF_PICKER_TYPES = [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }];

export default function PlayerPDFViewer({ instanceId }) {
  const { syncOptions, t } = useApp();
  const { token } = usePlayerSession();
  const [sharedFiles, setSharedFiles] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSharedLoading(true);
    getSharedFiles(token)
      .then((allFiles) => {
        if (!cancelled) setSharedFiles(allFiles.filter((f) => f.file_type === 'pdf'));
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
    useLinkedFiles(`pdfLinks:${instanceId}`, {
      syncOptions,
      pickerTypes: PDF_PICKER_TYPES,
      linkErrorMessage: t('fileViewer.linkErrorGeneric'),
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

  return (
    <div className="pdf-viewer">
      {sharedFiles.length > 0 && (
        <div className="pdf-viewer__files">
          {sharedFiles.map((f) => (
            <div
              key={f.id}
              className={`pdf-viewer__file-chip ${activeIsShared && f.id === activeId ? 'is-active' : ''}`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveIsShared(true);
                  setActiveId(f.id);
                }}
                title={f.file_name}
              >
                ☁️ {f.file_name}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pdf-viewer__toolbar">
        <button type="button" onClick={pickFiles}>
          {t('fileViewer.linkPdfButton')}
        </button>
        <input
          type="file"
          accept="application/pdf"
          multiple
          ref={fileInputRef}
          className="pdf-viewer__hidden-input"
          onChange={handleFileInputChange}
        />
        {!isFileSystemAccessSupported && <span className="pdf-viewer__hint">{t('fileViewer.localCopyHint')}</span>}
      </div>
      {error && <p className="pdf-viewer__error">{error}</p>}

      {files.length > 0 && (
        <div className="pdf-viewer__files">
          {files.map((f) => (
            <div
              key={f.id}
              className={`pdf-viewer__file-chip ${!activeIsShared && f.id === activeId ? 'is-active' : ''}`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveIsShared(false);
                  setActiveId(f.id);
                }}
                title={f.name}
              >
                📄 {f.name}
              </button>
              <button
                type="button"
                className="pdf-viewer__file-remove"
                onClick={() => removeFile(f.id)}
                aria-label={t('fileViewer.removeFileAria', { name: f.name })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pdf-viewer__content">
        {files.length === 0 && sharedFiles.length === 0 && <p className="pdf-viewer__empty">{t('fileViewer.emptyPdf')}</p>}
        {objectUrl && <embed src={objectUrl} type="application/pdf" className="pdf-viewer__embed" title="PDF" />}
      </div>
    </div>
  );
}
