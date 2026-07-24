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
-- Globales (compartidos entre todas las copias de módulos):
--   'players', 'enemies', 'lootTable', 'dashboardLayout',
--   'combats' (diccionario { [instanceIdDelTrackerDeIniciativa]: { combatants, currentTurnIndex } },
--   compartido en vivo entre cada Tracker de Iniciativa y cualquier Condition
--   Tracker / HP Tracker / Monster Reference vinculado a él; cada combatiente
--   lleva sus propios campos `conditions`, `hp: { current, max }`, y
--   opcionalmente `ac`/`notes`/`sourceEnemyId` cuando proviene del roster de
--   Enemigos)
--   'enemies' (roster compartido: { name, color, ac, hpMax, speed, attacks, notes },
--   administrado en la sección "Enemigos" igual que 'players')
-- Por instancia de módulo (uno por cada copia agregada al dashboard, sufijo
-- con el id único de esa instancia, ej. 'notes:8b1f...'):
--   'notes:<instanceId>', 'musicPlaylist:<instanceId>',
--   'diceRoller:<instanceId>', 'soundboard:<instanceId>',
--   'pdfLinks:<instanceId>', 'imageLinks:<instanceId>',
--   'conditionTracker:<instanceId>', 'hpTracker:<instanceId>', 'monsterReference:<instanceId>'
--   (estos tres últimos solo guardan a qué Tracker de Iniciativa está vinculada esa instancia)
-- Nota: para los visores de PDF/imagen solo se sincroniza la metadata (id y
-- nombre del archivo); el contenido del archivo vive únicamente en el
-- navegador del usuario (IndexedDB) y nunca se sube a Supabase.
