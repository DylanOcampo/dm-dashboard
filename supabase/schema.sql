-- Esquema sugerido para cuando conectes tu proyecto Supabase real.
-- Una sola tabla genérica guarda cada "slice" de datos de la app (jugadores,
-- loot table, layout del dashboard, notas, etc.) como JSON, ligado al usuario.

create table if not exists public.dashboard_data (
  user_id uuid references auth.users(id) on delete cascade not null,
  data_key text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, data_key)
);

alter table public.dashboard_data enable row level security;

create policy "Users can manage their own dashboard data"
  on public.dashboard_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- data_key esperados por el frontend:
-- Globales (compartidos entre todas las copias de módulos, y entre todas las escenas):
--   'players', 'enemies', 'npcs', 'lootTable',
--   'scenes' (array [{ id, name, layout }]: cada escena tiene su propio layout
--   de widgets del dashboard, independiente de las demás; reemplaza a la
--   antigua clave 'dashboardLayout', que ya no se usa pero se migra
--   automáticamente a la primera escena la primera vez que corre esta versión),
--   'activeSceneId' (qué escena está visible actualmente; si apunta a una
--   escena borrada, el frontend cae de vuelta a la primera disponible),
--   'combats' (diccionario { [instanceIdDelTrackerDeIniciativa]: { combatants, currentTurnIndex } },
--   compartido en vivo entre cada Tracker de Iniciativa y cualquier Condition
--   Tracker / HP Tracker / Monster Reference / NPC Reference / Save Throw
--   Tracker vinculado a él; cada combatiente lleva sus propios campos
--   `conditions`, `hp: { current, max }`, `deathSaves: { successes, failures }`,
--   `isDead`, y opcionalmente `ac`/`notes`/`sourceEnemyId`/`sourceNpcId` cuando
--   proviene de un roster)
--   'enemies' (roster compartido: { name, color, ac, hpMax, speed, attacks, notes },
--   administrado en la sección "Enemigos" igual que 'players')
--   'npcs' (roster compartido: { name, color, isCombat, description, ac, hpMax,
--   speed, attacks }, administrado en la sección "NPCs"; solo los NPCs con
--   isCombat=true pueden agregarse a un combate)
-- Por instancia de módulo (uno por cada copia agregada al dashboard, sufijo
-- con el id único de esa instancia, ej. 'notes:8b1f...'):
--   'notes:<instanceId>', 'musicPlaylist:<instanceId>',
--   'diceRoller:<instanceId>', 'soundboard:<instanceId>',
--   'pdfLinks:<instanceId>', 'imageLinks:<instanceId>',
--   'conditionTracker:<instanceId>', 'hpTracker:<instanceId>', 'monsterReference:<instanceId>',
--   'npcReference:<instanceId>', 'saveThrowTracker:<instanceId>'
--   (todos estos últimos solo guardan a qué Tracker de Iniciativa está vinculada esa instancia)
-- Nota: para los visores de PDF/imagen, cuando el usuario NO tiene
-- suscripción activa, solo se sincroniza la metadata (id y nombre del
-- archivo) y el contenido vive únicamente en su navegador (IndexedDB). Con
-- suscripción activa, el contenido real se sube a Supabase Storage — ver
-- las tablas y el bucket más abajo.

-- =====================================================================
-- Suscripciones (Stripe) + almacenamiento de archivos en la nube
-- =====================================================================

-- Una fila por usuario. Solo la escriben las Edge Functions (service_role);
-- el cliente únicamente puede leer su propia fila.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text check (plan in ('basic_monthly', 'basic_yearly', 'pro_monthly', 'pro_yearly')),
  status text not null default 'incomplete'
    check (status in ('active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused')),
  storage_limit_bytes bigint not null default 0,
  current_period_end timestamptz,
  -- Se setea la primera vez que el status deja de ser 'active'/'trialing';
  -- es el reloj de los 30 días para el borrado automático (ver
  -- cleanup-expired-files). Se limpia a null si vuelve a activarse.
  inactive_since timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read their own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- No hay policy de insert/update/delete para el rol authenticated a propósito:
-- solo el service_role (Edge Functions) puede escribir esta tabla, así un
-- usuario no puede simplemente hacer un UPDATE y marcarse premium.

-- true si el usuario tiene una suscripción con status activo ahora mismo.
create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and status in ('active', 'trialing')
  );
$$;

-- Metadata de cada archivo subido a Supabase Storage por un usuario con
-- suscripción activa. module_instance_id es el mismo instanceId que ya usan
-- 'pdfLinks:<instanceId>'/'imageLinks:<instanceId>' en dashboard_data, así
-- se puede resolver a qué escena pertenece el archivo igual que hoy se
-- resuelve qué widget (buscando qué scenes[].layout contiene ese id).
create table if not exists public.user_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  module_instance_id text not null,
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'image')),
  size_bytes bigint not null check (size_bytes >= 0),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists user_files_user_id_idx on public.user_files(user_id);

alter table public.user_files enable row level security;

-- Lectura siempre permitida al dueño, incluso con suscripción inactiva.
create policy "Users can read their own files"
  on public.user_files
  for select
  using (auth.uid() = user_id);

-- Escritura (insert/update/delete) solo si además la suscripción está activa.
create policy "Users can add files while subscribed"
  on public.user_files
  for insert
  with check (auth.uid() = user_id and public.has_active_subscription(auth.uid()));

create policy "Users can update their files while subscribed"
  on public.user_files
  for update
  using (auth.uid() = user_id and public.has_active_subscription(auth.uid()));

create policy "Users can delete their files while subscribed"
  on public.user_files
  for delete
  using (auth.uid() = user_id and public.has_active_subscription(auth.uid()));

-- Defensa adicional server-side (no solo UI/RLS): rechaza el insert si el
-- usuario se pasaría de su cuota de almacenamiento.
create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  used_bytes bigint;
  limit_bytes bigint;
begin
  select coalesce(sum(size_bytes), 0) into used_bytes
  from public.user_files where user_id = new.user_id;

  select storage_limit_bytes into limit_bytes
  from public.subscriptions where user_id = new.user_id;

  if limit_bytes is null then
    raise exception 'No active subscription for user %', new.user_id;
  end if;

  if used_bytes + new.size_bytes > limit_bytes then
    raise exception 'Storage quota exceeded (% + % > %)', used_bytes, new.size_bytes, limit_bytes;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_storage_quota_trigger on public.user_files;
create trigger enforce_storage_quota_trigger
  before insert on public.user_files
  for each row execute function public.enforce_storage_quota();

-- Bucket privado para el contenido real de los archivos. El path de cada
-- objeto debe empezar con "<user_id>/", igual que exigen las policies.
insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', false)
on conflict (id) do nothing;

create policy "Users can read their own storage objects"
  on storage.objects
  for select
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload storage objects while subscribed"
  on storage.objects
  for insert
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_active_subscription(auth.uid())
  );

create policy "Users can delete storage objects while subscribed"
  on storage.objects
  for delete
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_active_subscription(auth.uid())
  );

-- =====================================================================
-- Borrado automático: archivos de suscripciones inactivas hace > 30 días.
-- Requiere las extensiones pg_cron y pg_net (Dashboard → Database →
-- Extensions), y que la Edge Function 'cleanup-expired-files' ya esté
-- desplegada. Reemplazá <PROJECT_REF> y <SERVICE_ROLE_KEY> antes de correr
-- esto (ver SETUP.md paso "Cron de limpieza").
-- =====================================================================
-- select cron.schedule(
--   'cleanup-expired-files-daily',
--   '0 3 * * *',
--   $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cleanup-expired-files',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- =====================================================================
-- Compartir dashboard con jugadores (link, sin necesidad de cuenta)
-- =====================================================================
-- Independiente de la suscripción a propósito: un DM gratis también puede
-- compartir (solo el envío automático de archivos reales y el combate en
-- vivo están gateados por has_active_subscription, no esta tabla).
-- shared_enemies/shared_npcs ya vienen filtrados a revealed=true cuando el
-- cliente los escribe (ver src/hooks/useShareSync.js) — acá no se filtra de
-- nuevo porque esta tabla es privada (solo el dueño hace select/insert/update);
-- lo público pasa exclusivamente por get_shared_snapshot()/get_shared_files().
create table if not exists public.dm_shares (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_token uuid not null unique default gen_random_uuid(),
  enabled boolean not null default false,
  shared_module_types text[] not null default '{}',
  shared_players jsonb not null default '[]'::jsonb,
  shared_enemies jsonb not null default '[]'::jsonb,
  shared_npcs jsonb not null default '[]'::jsonb,
  share_all_files boolean not null default true,
  shared_file_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.dm_shares enable row level security;

create policy "DMs manage their own share config"
  on public.dm_shares
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Único punto de acceso público (anon, sin login) a los datos compartidos.
-- security definer: bypassa RLS de dm_shares, pero solo devuelve algo si el
-- token matchea exactamente — el token (uuid random) es el único secreto.
create or replace function public.get_shared_snapshot(token uuid)
returns table (
  share_token uuid,
  enabled boolean,
  shared_module_types text[],
  shared_players jsonb,
  shared_enemies jsonb,
  shared_npcs jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select share_token, enabled, shared_module_types, shared_players, shared_enemies, shared_npcs
  from public.dm_shares
  where share_token = token and enabled = true;
$$;

grant execute on function public.get_shared_snapshot(uuid) to anon, authenticated;

-- Fase 3 (archivos compartidos): join con user_files, mismo patrón de token.
create or replace function public.get_shared_files(token uuid)
returns setof public.user_files
language sql
stable
security definer
set search_path = public
as $$
  select f.*
  from public.user_files f
  join public.dm_shares s on s.user_id = f.user_id
  where s.share_token = token
    and s.enabled = true
    and (s.share_all_files or f.id = any(s.shared_file_ids));
$$;

grant execute on function public.get_shared_files(uuid) to anon, authenticated;
