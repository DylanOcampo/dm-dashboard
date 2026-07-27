import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const BUCKET = 'user-files';
const SIGNED_URL_TTL_SECONDS = 60 * 10;

// Pública (sin JWT de usuario — el jugador no tiene cuenta). El share_token
// es el único secreto: se valida contra dm_shares + user_files vía
// supabaseAdmin (bypassa RLS), replicando exactamente la condición de
// get_shared_files() en supabase/schema.sql.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { token, fileId } = await req.json();
    if (!token || !fileId) {
      return new Response(JSON.stringify({ error: 'Falta token o fileId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: share } = await supabaseAdmin
      .from('dm_shares')
      .select('user_id, enabled, share_all_files, shared_file_ids')
      .eq('share_token', token)
      .maybeSingle();

    if (!share || !share.enabled) {
      return new Response(JSON.stringify({ error: 'Link inválido o inactivo' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: file } = await supabaseAdmin
      .from('user_files')
      .select('storage_path, user_id')
      .eq('id', fileId)
      .maybeSingle();

    const isShared =
      file &&
      file.user_id === share.user_id &&
      (share.share_all_files || (share.shared_file_ids || []).includes(fileId));

    if (!isShared) {
      return new Response(JSON.stringify({ error: 'Ese archivo no está compartido' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signError) throw signError;

    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('get-shared-file-url error', err);
    return new Response(JSON.stringify({ error: 'No se pudo generar el link del archivo' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
