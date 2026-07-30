import { corsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripeClient.ts';
import { supabaseAdmin, getUserFromRequest } from '../_shared/supabaseAdmin.ts';

// Cancela la renovación (cancel_at_period_end = true), no la suscripción
// inmediatamente: el usuario conserva el acceso hasta current_period_end.
// Para cancelar ya mismo o para deshacer esto, usan el Billing Portal
// (create-portal-session) — acá solo cubrimos el caso más común: "no quiero
// que me vuelvan a cobrar".
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub?.stripe_subscription_id || !['active', 'trialing'].includes(sub.status)) {
      return new Response(JSON.stringify({ error: 'No tenés una suscripción activa' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // No esperamos al webhook para que la UI refleje el cambio al toque;
    // el webhook igual va a confirmar/reconciliar esto en cuanto llegue.
    await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        current_period_end: updated.current_period_end
          ? new Date(updated.current_period_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('cancel-subscription error', err);
    return new Response(JSON.stringify({ error: 'No se pudo cancelar la renovación' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
