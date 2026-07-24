import { useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useLinkedFiles } from '../../../hooks/useLinkedFiles';
import './PDFViewer.css';

const PDF_PICKER_TYPES = [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }];

export default function PDFViewer({ instanceId }) {
  const { syncOptions } = useApp();
  const {
    files,
    error,
    pickFiles,
    removeFile,
    resolveObjectUrl,
    fileInputRef,
    handleFileInputChange,
    isFileSystemAccessSupported,
  } = useLinkedFiles(`pdfLinks:${instanceId}`, { syncOptions, pickerTypes: PDF_PICKER_TYPES });

  const [activeId, setActiveId] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    if (files.length === 0) {
      setActiveId(null);
    } else if (!activeId || !files.some((f) => f.id === activeId)) {
      setActiveId(files[0].id);
    }
  }, [files, activeId]);

  useEffect(() => {
    let currentUrl = null;
    let cancelled = false;
    setObjectUrl(null);
    setNeedsPermission(false);
    if (!activeId) return undefined;
    resolveObjectUrl(activeId).then((res) => {
      if (cancelled) return;
      if (res?.url) {
        currentUrl = res.url;
        setObjectUrl(res.url);
      } else if (res?.needsPermission) {
        setNeedsPermission(true);
      }
    });
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [activeId, resolveObjectUrl]);

  const grantAccess = async () => {
    const res = await resolveObjectUrl(activeId, { requestIfNeeded: true });
    if (res?.url) {
      setObjectUrl(res.url);
      setNeedsPermission(false);
    }
  };

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer__toolbar">
        <button type="button" onClick={pickFiles}>
          + Vincular PDF
        </button>
        <input
          type="file"
          accept="application/pdf"
          multiple
          ref={fileInputRef}
          className="pdf-viewer__hidden-input"
          onChange={handleFileInputChange}
        />
        {!isFileSystemAccessSupported && (
          <span className="pdf-viewer__hint">Este navegador guarda una copia local del archivo.</span>
        )}
      </div>
      {error && <p className="pdf-viewer__error">{error}</p>}

      {files.length > 0 && (
        <div className="pdf-viewer__files">
          {files.map((f) => (
            <div key={f.id} className={`pdf-viewer__file-chip ${f.id === activeId ? 'is-active' : ''}`}>
              <button type="button" onClick={() => setActiveId(f.id)} title={f.name}>
                📄 {f.name}
              </button>
              <button
                type="button"
                className="pdf-viewer__file-remove"
                onClick={() => removeFile(f.id)}
                aria-label={`Quitar ${f.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pdf-viewer__content">
        {files.length === 0 && <p className="pdf-viewer__empty">Sin PDFs vinculados.</p>}
        {files.length > 0 && needsPermission && (
          <div className="pdf-viewer__permission">
            <p>Se necesita permiso para leer este archivo de nuevo.</p>
            <button type="button" onClick={grantAccess}>
              Conceder acceso
            </button>
          </div>
        )}
        {objectUrl && <embed src={objectUrl} type="application/pdf" className="pdf-viewer__embed" title="PDF" />}
      </div>
    </div>
  );
}
