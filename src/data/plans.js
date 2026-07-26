// Catálogo de planes ↔ Stripe Price IDs (creados en modo test vía API).
// Debe reflejar exactamente lo que hay en supabase/functions/_shared/plans.ts.
const GIB = 1024 * 1024 * 1024;

export const PLANS = [
  {
    id: 'basic',
    storageGB: 1,
    storageBytes: 1 * GIB,
    monthly: { priceId: 'price_1TxXu3BKGP9bEH90kTMTpJs2', amount: 2, planCode: 'basic_monthly' },
    yearly: { priceId: 'price_1TxXu4BKGP9bEH90cnyznv36', amount: 20, planCode: 'basic_yearly' },
  },
  {
    id: 'pro',
    storageGB: 10,
    storageBytes: 10 * GIB,
    monthly: { priceId: 'price_1TxXu5BKGP9bEH90Iwx3UhHx', amount: 7, planCode: 'pro_monthly' },
    yearly: { priceId: 'price_1TxXu5BKGP9bEH90Ayos5qkS', amount: 60, planCode: 'pro_yearly' },
  },
];

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
