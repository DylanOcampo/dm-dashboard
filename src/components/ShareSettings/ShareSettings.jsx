import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import './ShareSettings.css';

const SHAREABLE_MODULE_TYPES = [
  'time',
  'music',
  'notes',
  'dice',
  'soundboard',
  'calculator',
  'pdf',
  'image',
  'initiative',
  'hp',
  'saveThrows',
  'monsters',
  'npcs',
];

export default function ShareSettings() {
  const { share, shareLoading, updateShareConfig, regenerateShareToken, shareUrl, isSupabaseConfigured, t } =
    useApp();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Ref sincrónica en vez de leer `share` del render: dos clicks rápidos en
  // distintos checkboxes calculan el "next" antes de que el primer request
  // vuelva, y si ambos partieran del mismo `share` de React se pisarían uno
  // al otro (el segundo update descartaría el primero).
  const pendingTypesRef = useRef(share?.shared_module_types || []);
  useEffect(() => {
    pendingTypesRef.current = share?.shared_module_types || [];
  }, [share?.shared_module_types]);

  const handleToggleEnabled = async () => {
    setError('');
    try {
      await updateShareConfig({ enabled: !share?.enabled });
    } catch {
      setError(t('share.errorGeneric'));
    }
  };

  const toggleModuleType = async (type) => {
    setError('');
    const current = pendingTypesRef.current;
    const next = current.includes(type) ? current.filter((m) => m !== type) : [...current, type];
    pendingTypesRef.current = next;
    try {
      await updateShareConfig({ shared_module_types: next });
    } catch {
      setError(t('share.errorGeneric'));
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('share.errorCopy'));
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm(t('share.regenerateConfirm'))) return;
    setError('');
    try {
      await regenerateShareToken();
    } catch {
      setError(t('share.errorGeneric'));
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <section className="share-settings">
        <h2>{t('share.title')}</h2>
        <p className="share-settings__warning">{t('account.warningNoSupabase')}</p>
      </section>
    );
  }

  if (shareLoading || !share) {
    return (
      <section className="share-settings">
        <h2>{t('share.title')}</h2>
        <p className="share-settings__loading">{t('share.loading')}</p>
      </section>
    );
  }

  return (
    <section className="share-settings">
      <h2>{t('share.title')}</h2>
      <p className="share-settings__intro">{t('share.intro')}</p>

      <label className="share-settings__toggle">
        <input type="checkbox" checked={Boolean(share.enabled)} onChange={handleToggleEnabled} />
        {t('share.enableLabel')}
      </label>

      {share.enabled && (
        <>
          <div className="share-settings__link-row">
            <input type="text" readOnly value={shareUrl || ''} className="share-settings__link-input" />
            <button type="button" onClick={handleCopy}>
              {copied ? t('share.copiedButton') : t('share.copyButton')}
            </button>
            <button type="button" className="share-settings__regenerate" onClick={handleRegenerate}>
              {t('share.regenerateButton')}
            </button>
          </div>

          <h3>{t('share.moduleTypesTitle')}</h3>
          <p className="share-settings__hint">{t('share.moduleTypesHint')}</p>
          <div className="share-settings__module-grid">
            {SHAREABLE_MODULE_TYPES.map((type) => (
              <label key={type} className="share-settings__module-checkbox">
                <input
                  type="checkbox"
                  checked={(share.shared_module_types || []).includes(type)}
                  onChange={() => toggleModuleType(type)}
                />
                {t(`dashboard.modules.${type}`)}
              </label>
            ))}
          </div>
        </>
      )}

      {error && <p className="share-settings__error">{error}</p>}
    </section>
  );
}
