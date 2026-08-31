-- =============================================================
-- Peak Performance — 0028: plantillas de DÍA y SEMANA completos.
--
-- Complementa a `plantillas_bloque` (que guarda un bloque suelto).
-- Acá se guarda un día entero (ec + bloques) o una semana entera
-- (los 4 días), para reusarlos en otro día/semana.
-- Las usan todos los profes (igual que las de bloque).
-- Pegar en Supabase → SQL Editor. Idempotente.
-- =============================================================

create table if not exists public.plantillas_plan (
  id         bigint generated always as identity primary key,
  tipo       text not null check (tipo in ('dia', 'semana')),
  nombre     text not null,
  contenido  jsonb not null default '{}',   -- día: {ec, bloques} · semana: {dias:[{dia, ec, bloques}]}
  created_at timestamptz not null default now()
);

alter table public.plantillas_plan enable row level security;
drop policy if exists plantillas_plan_staff on public.plantillas_plan;
create policy plantillas_plan_staff on public.plantillas_plan
  for all to authenticated using (true) with check (true);
