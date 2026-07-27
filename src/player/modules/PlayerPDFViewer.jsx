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

  useEffect(() => {
    getSharedFiles(token)
      .then((files) => setSharedFiles(files.filter((f) => f.file_type === 'pdf')))
      .catch(() => setSharedFiles([]));
  }, [token]);

  const { files, error, pickFiles, removeFile, resolveObjectUrl, fileInputRef, handleFileInputChange, isFileSystemAccessSupported } =
    useLinkedFiles(`pdfLinks:${instanceId}`, {
      syncOptions,
      pickerTypes: PDF_PICKER_TYPES,
      linkErrorMessage: t('fileViewer.linkErrorGeneric'),
    });

  const [activeId, setActiveId] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);

  const openShared = async (file) => {
    try {
      const url = await getSharedFileUrl(token, file.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // ignorar: el archivo pudo haber sido des-compartido en el medio
    }
  };

  useEffect(() => {
    let currentUrl = null;
    let cancelled = false;
    setObjectUrl(null);
    if (!activeId) return undefined;
    resolveObjectUrl(activeId).then((res) => {
      if (cancelled || !res?.url) return;
      currentUrl = res.url;
      setObjectUrl(res.url);
    });
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [activeId, resolveObjectUrl]);

  return (
    <div className="pdf-viewer">
      {sharedFiles.length > 0 && (
        <div className="pdf-viewer__files">
          {sharedFiles.map((f) => (
            <div key={f.id} className="pdf-viewer__file-chip">
              <button type="button" onClick={() => openShared(f)} title={f.file_name}>
                📄 {f.file_name}
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
            <div key={f.id} className={`pdf-viewer__file-chip ${f.id === activeId ? 'is-active' : ''}`}>
              <button type="button" onClick={() => setActiveId(f.id)} title={f.name}>
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
