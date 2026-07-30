import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PLANS, formatBytes } from '../../data/plans';
import { createPortalSession, cancelSubscriptionRemote } from '../../services/stripeService';
import Pricing from '../Pricing/Pricing';
import './Account.css';

const GRACE_PERIOD_DAYS = 30;

function planLabel(t, planCode) {
  if (!planCode) return '';
  const [id, billing] = planCode.split('_');
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) return planCode;
  return t('account.planLabel', {
    name: t(`pricing.plans.${plan.id}.name`),
    billing: billing === 'yearly' ? t('pricing.yearly') : t('pricing.monthly'),
  });
}

export default function Account() {
  const {
    user,
    authLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    deleteAccount,
    subscription,
    refreshSubscription,
    storageUsedBytes,
    isSupabaseConfigured,
    t,
  } = useApp();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelingRenewal, setCancelingRenewal] = useState(false);

  const deletionDate = useMemo(() => {
    if (!subscription?.inactive_since) return null;
    const d = new Date(subscription.inactive_since);
    d.setDate(d.getDate() + GRACE_PERIOD_DAYS);
    return d;
  }, [subscription]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormNotice('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setFormNotice(t('account.signupSuccess'));
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setFormError(err.message || t('account.authErrorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setFormError('');
    setFormNotice('');
    if (!email) {
      setFormError(t('account.emailRequiredForReset'));
      return;
    }
    try {
      await resetPassword(email);
      setFormNotice(t('account.resetEmailSent'));
    } catch (err) {
      setFormError(err.message || t('account.authErrorGeneric'));
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setFormError(t('account.portalError'));
      setPortalLoading(false);
    }
  };

  const handleCancelRenewal = async () => {
    if (!window.confirm(t('account.cancelRenewalConfirm'))) return;
    setCancelingRenewal(true);
    setFormError('');
    try {
      await cancelSubscriptionRemote();
      await refreshSubscription();
    } catch (err) {
      setFormError(t('account.cancelRenewalError'));
    } finally {
      setCancelingRenewal(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('account.deleteConfirm'))) return;
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      setFormError(t('account.deleteError'));
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <section className="account">
        <p className="account__intro">{t('account.loading')}</p>
      </section>
    );
  }

  if (!user.isAuthenticated) {
    return (
      <section className="account">
        <h2>{t('account.title')}</h2>
        {!isSupabaseConfigured && <p className="account__warning">{t('account.warningNoSupabase')}</p>}
        <p className="account__intro">
          {mode === 'signup' ? t('account.introSignup') : t('account.introGuest')}
        </p>
        <form className="account__auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t('account.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('account.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button type="submit" disabled={submitting || !isSupabaseConfigured}>
            {mode === 'signup' ? t('account.signupButton') : t('account.loginButton')}
          </button>
        </form>
        {formError && <p className="account__error">{formError}</p>}
        {formNotice && <p className="account__notice">{formNotice}</p>}
        <div className="account__auth-switch">
          {mode === 'signin' ? (
            <>
              <button type="button" className="account__link" onClick={() => setMode('signup')}>
                {t('account.switchToSignup')}
              </button>
              <button type="button" className="account__link" onClick={handleForgotPassword}>
                {t('account.forgotPassword')}
              </button>
            </>
          ) : (
            <button type="button" className="account__link" onClick={() => setMode('signin')}>
              {t('account.switchToSignin')}
            </button>
          )}
        </div>
        <p className="account__disclaimer">{t('account.disclaimerGuest')}</p>
      </section>
    );
  }

  return (
    <section className="account">
      <h2>{t('account.title')}</h2>
      <div className="account__info">
        <span className="account__email">{user.email}</span>
        <span
          className={`account__badge ${user.isPremium ? 'is-premium' : ''} ${user.isInactiveSubscriber ? 'is-inactive' : ''}`}
        >
          {user.isPremium
            ? planLabel(t, subscription.plan)
            : user.isInactiveSubscriber
              ? t('account.planInactive')
              : t('account.planFree')}
        </span>
      </div>

      {!isSupabaseConfigured && <p className="account__warning">{t('account.warningNoSupabase')}</p>}

      {user.isInactiveSubscriber && (
        <p className="account__warning account__warning--danger">
          {deletionDate
            ? t('account.inactiveWarningWithDate', { date: deletionDate.toLocaleDateString() })
            : t('account.inactiveWarning')}
        </p>
      )}

      {user.isPremium && subscription?.cancel_at_period_end && (
        <p className="account__warning">
          {subscription.current_period_end
            ? t('account.cancelRenewalNoticeWithDate', {
                date: new Date(subscription.current_period_end).toLocaleDateString(),
              })
            : t('account.cancelRenewalNotice')}
        </p>
      )}

      {user.isPremium && subscription && (
        <div className="account__usage">
          <div className="account__usage-bar">
            <div
              className="account__usage-fill"
              style={{
                width: `${Math.min(100, (storageUsedBytes / (subscription.storage_limit_bytes || 1)) * 100)}%`,
              }}
            />
          </div>
          <p className="account__usage-label">
            {t('account.usageLabel', {
              used: formatBytes(storageUsedBytes),
              limit: formatBytes(subscription.storage_limit_bytes),
            })}
          </p>
        </div>
      )}

      {(!user.isPremium || user.isInactiveSubscriber) && <Pricing />}

      <div className="account__actions">
        {user.isPremium && (
          <button type="button" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading ? t('account.redirecting') : t('account.manageSubscriptionButton')}
          </button>
        )}
        {user.isPremium && !subscription?.cancel_at_period_end && (
          <button type="button" onClick={handleCancelRenewal} disabled={cancelingRenewal}>
            {cancelingRenewal ? t('account.canceling') : t('account.cancelRenewalButton')}
          </button>
        )}
        <button type="button" className="account__logout" onClick={signOut}>
          {t('account.logoutButton')}
        </button>
        <button
          type="button"
          className="account__delete"
          onClick={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? t('account.deleting') : t('account.deleteAccountButton')}
        </button>
      </div>
      {formError && <p className="account__error">{formError}</p>}
      <p className="account__disclaimer">{t('account.disclaimerUser')}</p>
    </section>
  );
}
