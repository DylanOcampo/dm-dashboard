import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase
// automáticamente en el runtime de cada Edge Function desplegada — no hace
// falta setearlos a mano con `supabase secrets set`.
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Valida el JWT que manda el cliente en `Authorization: Bearer <jwt>` y
// devuelve el usuario autenticado, o null si el token es inválido/falta.
export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
