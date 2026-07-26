import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PLANS } from '../../data/plans';
import { createCheckoutSession } from '../../services/stripeService';
import './Pricing.css';

export default function Pricing() {
  const { t } = useApp();
  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');

  const handleSubscribe = async (plan) => {
    setError('');
    setLoadingPlan(plan.id);
    try {
      const priceId = plan[billing].priceId;
      const url = await createCheckoutSession(priceId);
      window.location.href = url;
    } catch (err) {
      setError(t('pricing.checkoutError'));
      setLoadingPlan(null);
    }
  };

  return (
    <div className="pricing">
      <div className="pricing__toggle">
        <button
          type="button"
          className={billing === 'monthly' ? 'is-active' : ''}
          onClick={() => setBilling('monthly')}
        >
          {t('pricing.monthly')}
        </button>
        <button
          type="button"
          className={billing === 'yearly' ? 'is-active' : ''}
          onClick={() => setBilling('yearly')}
        >
          {t('pricing.yearly')}
        </button>
      </div>

      {error && <p className="pricing__error">{error}</p>}

      <div className="pricing__cards">
        {PLANS.map((plan) => (
          <div key={plan.id} className="pricing__card">
            <h3>{t(`pricing.plans.${plan.id}.name`)}</h3>
            <p className="pricing__storage">{t('pricing.storage', { gb: plan.storageGB })}</p>
            <p className="pricing__price">
              <span className="pricing__amount">${plan[billing].amount}</span>
              <span className="pricing__period">
                {billing === 'monthly' ? t('pricing.perMonth') : t('pricing.perYear')}
              </span>
            </p>
            <button
              type="button"
              className="pricing__subscribe"
              disabled={loadingPlan === plan.id}
              onClick={() => handleSubscribe(plan)}
            >
              {loadingPlan === plan.id ? t('pricing.redirecting') : t('pricing.subscribeButton')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
