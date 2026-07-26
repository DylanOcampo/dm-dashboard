import { corsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripeClient.ts';
import { supabaseAdmin, getUserFromRequest } from '../_shared/supabaseAdmin.ts';

const BUCKET = 'user-files';

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
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch (err) {
        // Puede ya estar cancelada; no bloquear el borrado de la cuenta por esto.
        console.warn('delete-account: no se pudo cancelar en Stripe', err);
      }
    }

    const { data: listed } = await supabaseAdmin.storage.from(BUCKET).list(user.id, { limit: 1000 });
    const paths = (listed ?? []).map((f) => `${user.id}/${f.name}`);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from(BUCKET).remove(paths);
    }

    // subscriptions, user_files y dashboard_data tienen "on delete cascade"
    // sobre auth.users, así que borrar el usuario ya limpia esas filas.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('delete-account error', err);
    return new Response(JSON.stringify({ error: 'No se pudo eliminar la cuenta' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
