import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const BUCKET = 'user-files';
const GRACE_PERIOD_DAYS = 30;

// Pensada para correr diario vía pg_cron (ver supabase/schema.sql, sección
// "Borrado automático"). Borra los archivos de cualquier usuario cuya
// suscripción lleve más de GRACE_PERIOD_DAYS inactiva.
Deno.serve(async () => {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, inactive_since')
    .not('inactive_since', 'is', null)
    .lt('inactive_since', cutoff);

  if (error) {
    console.error('cleanup-expired-files: error consultando subscriptions', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const cleaned: string[] = [];

  for (const row of expired ?? []) {
    const userId = row.user_id as string;
    const { data: listed } = await supabaseAdmin.storage.from(BUCKET).list(userId, { limit: 1000 });
    const paths = (listed ?? []).map((f) => `${userId}/${f.name}`);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from(BUCKET).remove(paths);
    }
    await supabaseAdmin.from('user_files').delete().eq('user_id', userId);
    cleaned.push(userId);
  }

  return new Response(JSON.stringify({ cleaned, count: cleaned.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
