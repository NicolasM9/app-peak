-- =============================================================
-- Peak Performance — Planificaciones (rutinas por mes/semana/día)
-- Espacio de los profes para planificar mes a mes. Cada sesión:
--   ec:       entrada en calor  [{ "nombre":"...", "reps":"...", "series":"..." }]
--   bloques:  [{ "nombre":"B1", "ejercicios":[{ nombre, reps, series }] }, ...]
-- Correr en Supabase → SQL Editor. Idempotente.
-- Datos de ENTRENAMIENTO: los ve/edita todo el staff (profes incluidos).
-- =============================================================

create table if not exists public.planificaciones (
  id         bigint generated always as identity primary key,
  mes        integer not null check (mes between 1 and 12),
  semana     integer not null check (semana between 1 and 6),
  dia        integer not null check (dia between 1 and 7),
  ec         jsonb not null default '[]'::jsonb,
  bloques    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mes, semana, dia)
);

alter table public.planificaciones enable row level security;

drop policy if exists planificaciones_staff on public.planificaciones;
create policy planificaciones_staff on public.planificaciones
  for all to authenticated using (true) with check (true);
