import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLinkedFiles } from '../../hooks/useLinkedFiles';
import { usePlayerSession } from '../PlayerSessionContext';
import { getSharedFiles, getSharedFileUrl } from '../../services/shareService';
import '../../components/modules/ImageViewer/ImageViewer.css';

const IMAGE_PICKER_TYPES = [
  { description: 'Imágenes', accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] } },
];

export default function PlayerImageViewer({ instanceId }) {
  const { syncOptions, t } = useApp();
  const { token } = usePlayerSession();
  const [sharedFiles, setSharedFiles] = useState([]);
  const [sharedUrls, setSharedUrls] = useState({});
  const [activeSharedId, setActiveSharedId] = useState(null);

  useEffect(() => {
    getSharedFiles(token)
      .then((files) => setSharedFiles(files.filter((f) => f.file_type === 'image')))
      .catch(() => setSharedFiles([]));
  }, [token]);

  const { files, error, pickFiles, removeFile, resolveObjectUrl, fileInputRef, handleFileInputChange, isFileSystemAccessSupported } =
    useLinkedFiles(`imageLinks:${instanceId}`, {
      syncOptions,
      pickerTypes: IMAGE_PICKER_TYPES,
      linkErrorMessage: t('fileViewer.linkErrorGeneric'),
    });

  const [activeId, setActiveId] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);

  const showShared = async (file) => {
    setActiveId(null);
    setActiveSharedId(file.id);
    if (sharedUrls[file.id]) return;
    try {
      const url = await getSharedFileUrl(token, file.id);
      setSharedUrls((prev) => ({ ...prev, [file.id]: url }));
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

  const activeSharedUrl = activeSharedId ? sharedUrls[activeSharedId] : null;
  const activeName =
    files.find((f) => f.id === activeId)?.name ??
    sharedFiles.find((f) => f.id === activeSharedId)?.file_name ??
    t('fileViewer.emptyImage');

  return (
    <div className="image-viewer">
      {sharedFiles.length > 0 && (
        <div className="image-viewer__files">
          {sharedFiles.map((f) => (
            <div key={f.id} className={`image-viewer__file-chip ${f.id === activeSharedId ? 'is-active' : ''}`}>
              <button type="button" onClick={() => showShared(f)} title={f.file_name}>
                🖼️ {f.file_name}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="image-viewer__toolbar">
        <button type="button" onClick={pickFiles}>
          {t('fileViewer.linkImageButton')}
        </button>
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          className="image-viewer__hidden-input"
          onChange={handleFileInputChange}
        />
        {!isFileSystemAccessSupported && <span className="image-viewer__hint">{t('fileViewer.localCopyHint')}</span>}
      </div>
      {error && <p className="image-viewer__error">{error}</p>}

      {files.length > 0 && (
        <div className="image-viewer__files">
          {files.map((f) => (
            <div key={f.id} className={`image-viewer__file-chip ${f.id === activeId ? 'is-active' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  setActiveSharedId(null);
                  setActiveId(f.id);
                }}
                title={f.name}
              >
                🖼️ {f.name}
              </button>
              <button
                type="button"
                className="image-viewer__file-remove"
                onClick={() => removeFile(f.id)}
                aria-label={t('fileViewer.removeFileAria', { name: f.name })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="image-viewer__content">
        {files.length === 0 && sharedFiles.length === 0 && (
          <p className="image-viewer__empty">{t('fileViewer.emptyImage')}</p>
        )}
        {(objectUrl || activeSharedUrl) && (
          <img src={objectUrl || activeSharedUrl} alt={activeName} className="image-viewer__image" />
        )}
      </div>
    </div>
  );
}
