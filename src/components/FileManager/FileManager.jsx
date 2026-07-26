import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatBytes } from '../../data/plans';
import { deleteUserFile, getSignedUrl } from '../../services/fileStorageService';
import './FileManager.css';

export default function FileManager() {
  const { t, user, scenes, cloudFiles, refreshCloudFiles, storageUsedBytes, subscription } = useApp();
  const [sceneFilter, setSceneFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

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
