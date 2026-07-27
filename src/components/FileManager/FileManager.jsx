import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatBytes } from '../../data/plans';
import { deleteUserFile, getSignedUrl } from '../../services/fileStorageService';
import './FileManager.css';

export default function FileManager() {
  const { t, user, scenes, cloudFiles, refreshCloudFiles, storageUsedBytes, subscription, share, updateShareConfig } =
    useApp();
  const [sceneFilter, setSceneFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const shareAllFiles = Boolean(share?.share_all_files);
  const sharedFileIds = share?.shared_file_ids || [];

  // Ver el comentario equivalente en ShareSettings.jsx: evita que dos
  // toggles rápidos se pisen entre sí por leer un `share` de React ya viejo.
  const pendingFileIdsRef = useRef(sharedFileIds);
  useEffect(() => {
    pendingFileIdsRef.current = sharedFileIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share?.shared_file_ids]);

  const handleToggleShareAll = async () => {
    try {
      await updateShareConfig({ share_all_files: !shareAllFiles });
    } catch {
      setError(t('share.errorGeneric'));
    }
  };

  const handleToggleFileShared = async (file) => {
    const current = pendingFileIdsRef.current;
    const next = current.includes(file.id) ? current.filter((id) => id !== file.id) : [...current, file.id];
    pendingFileIdsRef.current = next;
    try {
      await updateShareConfig({ shared_file_ids: next });
    } catch {
      setError(t('share.errorGeneric'));
    }
  };

  const sceneNameByInstanceId = useMemo(() => {
    const map = {};
    scenes.forEach((scene) => {
      scene.layout.forEach((item) => {
        map[item.i] = scene.name;
      });
    });
    return map;
  }, [scenes]);

  const filteredFiles = useMemo(
    () =>
      cloudFiles.filter((f) => {
        if (typeFilter !== 'all' && f.file_type !== typeFilter) return false;
        if (sceneFilter === 'all') return true;
        const sceneName = sceneNameByInstanceId[f.module_instance_id];
        if (sceneFilter === 'unknown') return !sceneName;
        return sceneName === sceneFilter;
      }),
    [cloudFiles, typeFilter, sceneFilter, sceneNameByInstanceId]
  );

  const sceneOptions = useMemo(() => {
    const names = new Set(scenes.map((s) => s.name));
    return Array.from(names);
  }, [scenes]);

  const handleView = async (file) => {
    setError('');
    try {
      const url = await getSignedUrl(file.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError(t('fileManager.viewError'));
    }
  };

  const handleDelete = async (file) => {
    if (!user.isPremium) return;
    if (!window.confirm(t('fileManager.deleteConfirm', { name: file.file_name }))) return;
    setBusyId(file.id);
    setError('');
    try {
      await deleteUserFile(file);
      await refreshCloudFiles();
    } catch {
      setError(t('fileManager.deleteError'));
    } finally {
      setBusyId(null);
    }
  };

  if (!user.hasSubscribedBefore) {
    return (
      <section className="file-manager">
        <h2>{t('fileManager.title')}</h2>
        <p className="file-manager__empty">{t('fileManager.needsSubscription')}</p>
      </section>
    );
  }

  return (
    <section className="file-manager">
      <h2>{t('fileManager.title')}</h2>

      {user.isInactiveSubscriber && <p className="file-manager__warning">{t('fileManager.readOnlyWarning')}</p>}

      {subscription?.storage_limit_bytes > 0 && (
        <p className="file-manager__usage">
          {t('account.usageLabel', {
            used: formatBytes(storageUsedBytes),
            limit: formatBytes(subscription.storage_limit_bytes),
          })}
        </p>
      )}

      <div className="file-manager__filters">
        <select value={sceneFilter} onChange={(e) => setSceneFilter(e.target.value)}>
          <option value="all">{t('fileManager.allScenes')}</option>
          {sceneOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value="unknown">{t('fileManager.unknownScene')}</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">{t('fileManager.allTypes')}</option>
          <option value="pdf">{t('fileManager.typePdf')}</option>
          <option value="image">{t('fileManager.typeImage')}</option>
        </select>
      </div>

      {share && (
        <label className="file-manager__share-all">
          <input type="checkbox" checked={shareAllFiles} onChange={handleToggleShareAll} />
          {t('fileManager.shareAllLabel')}
        </label>
      )}

      {error && <p className="file-manager__error">{error}</p>}

      {filteredFiles.length === 0 ? (
        <p className="file-manager__empty">{t('fileManager.empty')}</p>
      ) : (
        <table className="file-manager__table">
          <thead>
            <tr>
              <th>{t('fileManager.columnName')}</th>
              <th>{t('fileManager.columnScene')}</th>
              <th>{t('fileManager.columnType')}</th>
              <th>{t('fileManager.columnSize')}</th>
              {share && <th>{t('fileManager.columnShared')}</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map((file) => (
              <tr key={file.id}>
                <td>{file.file_name}</td>
                <td>{sceneNameByInstanceId[file.module_instance_id] || t('fileManager.unknownScene')}</td>
                <td>{file.file_type === 'pdf' ? '📄' : '🖼️'} {file.file_type}</td>
                <td>{formatBytes(file.size_bytes)}</td>
                {share && (
                  <td>
                    <input
                      type="checkbox"
                      checked={shareAllFiles || sharedFileIds.includes(file.id)}
                      disabled={shareAllFiles}
                      onChange={() => handleToggleFileShared(file)}
                      aria-label={t('fileManager.shareFileAria', { name: file.file_name })}
                    />
                  </td>
                )}
                <td className="file-manager__row-actions">
                  <button type="button" onClick={() => handleView(file)}>
                    {t('fileManager.viewButton')}
                  </button>
                  <button
                    type="button"
                    className="file-manager__delete"
                    disabled={!user.isPremium || busyId === file.id}
                    title={!user.isPremium ? t('fileManager.readOnlyWarning') : undefined}
                    onClick={() => handleDelete(file)}
                  >
                    {t('fileManager.deleteButton')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
