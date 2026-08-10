-- =============================================================
-- Peak Performance — 0017: historial de lesiones
--
-- Hasta ahora la lesión vivía en `alumnos` (estado_fisico + lesion_detalle +
-- lesion_desde) = solo la lesión ACTUAL. Para informar lesionados, contar
-- recuperadas, tipos y duración hace falta un historial:
--
--   lesiones : cada lesión de un alumno. hasta = null -> activa;
--              con fecha -> recuperada (duración = hasta - desde).
--
-- Solo admin (el profe no ve datos de alumnos). Idempotente.
-- Correr en Supabase → SQL Editor.
-- =============================================================

create table if not exists public.lesiones (
  id         bigint generated always as identity primary key,
  alumno_id  bigint not null references public.alumnos(id) on delete cascade,
  tipo       text not null,
  desde      date not null,
  hasta      date,
  created_at timestamptz not null default now()
);
create index if not exists idx_lesiones_alumno on public.lesiones(alumno_id);

alter table public.lesiones enable row level security;

drop policy if exists lesiones_admin on public.lesiones;
create policy lesiones_admin on public.lesiones
  for all to authenticated using (es_admin()) with check (es_admin());
