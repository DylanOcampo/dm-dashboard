// Catálogo de planes ↔ Stripe Price IDs (creados en modo test vía API).
// Debe reflejar exactamente lo que hay en src/data/plans.js del frontend.
const GIB = 1024 * 1024 * 1024;

export const PLANS_BY_PRICE_ID: Record<
  string,
  { plan: string; storageLimitBytes: number }
> = {
  price_1TxXu3BKGP9bEH90kTMTpJs2: { plan: 'basic_monthly', storageLimitBytes: 1 * GIB },
  price_1TxXu4BKGP9bEH90cnyznv36: { plan: 'basic_yearly', storageLimitBytes: 1 * GIB },
  price_1TxXu5BKGP9bEH90Iwx3UhHx: { plan: 'pro_monthly', storageLimitBytes: 10 * GIB },
  price_1TxXu5BKGP9bEH90Ayos5qkS: { plan: 'pro_yearly', storageLimitBytes: 10 * GIB },
};
