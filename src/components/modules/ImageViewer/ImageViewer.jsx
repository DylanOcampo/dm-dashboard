import { useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useLinkedFiles } from '../../../hooks/useLinkedFiles';
import './ImageViewer.css';

const IMAGE_PICKER_TYPES = [
  { description: 'Imágenes', accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] } },
];

export default function ImageViewer({ instanceId }) {
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
  } = useLinkedFiles(`imageLinks:${instanceId}`, { syncOptions, pickerTypes: IMAGE_PICKER_TYPES });

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

  const activeName = files.find((f) => f.id === activeId)?.name ?? 'Imagen';

  return (
    <div className="image-viewer">
      <div className="image-viewer__toolbar">
        <button type="button" onClick={pickFiles}>
          + Vincular imagen
        </button>
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          className="image-viewer__hidden-input"
          onChange={handleFileInputChange}
        />
        {!isFileSystemAccessSupported && (
          <span className="image-viewer__hint">Este navegador guarda una copia local del archivo.</span>
        )}
      </div>
      {error && <p className="image-viewer__error">{error}</p>}

      {files.length > 0 && (
        <div className="image-viewer__files">
          {files.map((f) => (
            <div key={f.id} className={`image-viewer__file-chip ${f.id === activeId ? 'is-active' : ''}`}>
              <button type="button" onClick={() => setActiveId(f.id)} title={f.name}>
                🖼️ {f.name}
              </button>
              <button
                type="button"
                className="image-viewer__file-remove"
                onClick={() => removeFile(f.id)}
                aria-label={`Quitar ${f.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="image-viewer__content">
        {files.length === 0 && <p className="image-viewer__empty">Sin imágenes vinculadas.</p>}
        {files.length > 0 && needsPermission && (
          <div className="image-viewer__permission">
            <p>Se necesita permiso para leer este archivo de nuevo.</p>
            <button type="button" onClick={grantAccess}>
              Conceder acceso
            </button>
          </div>
        )}
        {objectUrl && <img src={objectUrl} alt={activeName} className="image-viewer__image" />}
      </div>
    </div>
  );
}
