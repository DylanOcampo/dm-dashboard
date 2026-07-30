import { stripe, cryptoProvider } from '../_shared/stripeClient.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { PLANS_BY_PRICE_ID } from '../_shared/plans.ts';

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

async function upsertFromSubscription(subscription: any, userIdHint?: string | null) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const planInfo = priceId ? PLANS_BY_PRICE_ID[priceId] : undefined;

  let userId = userIdHint || subscription.metadata?.supabase_user_id || null;
  if (!userId) {
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    console.warn('stripe-webhook: no pude resolver user_id para customer', customerId);
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from('subscriptions')
    .select('inactive_since')
    .eq('user_id', userId)
    .maybeSingle();

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const inactiveSince = isActive ? null : existing?.inactive_since ?? new Date().toISOString();

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan: planInfo?.plan ?? null,
      status: subscription.status,
      storage_limit_bytes: planInfo?.storageLimitBytes ?? 0,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      inactive_since: inactiveSince,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  if (!signature || !webhookSecret) {
    return new Response('Falta firma o STRIPE_WEBHOOK_SECRET', { status: 400 });
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
  } catch (err) {
    console.error('stripe-webhook: firma inválida', err);
    return new Response(`Webhook signature error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertFromSubscription(subscription, session.client_reference_id);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await upsertFromSubscription(subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('stripe-webhook: error procesando evento', event.type, err);
    return new Response('Error procesando el evento', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
