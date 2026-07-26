import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

// stripe-node usa Node's `crypto` (sync) para verificar la firma del
// webhook por default, que no existe en el runtime de Deno de Supabase.
// Este provider usa SubtleCrypto (async) en su lugar.
export const cryptoProvider = Stripe.createSubtleCryptoProvider();
