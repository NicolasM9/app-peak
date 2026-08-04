-- =============================================================
-- Peak Performance — Acuerdos de profes (cálculo de lo que cobra cada uno)
-- Agrega campos del acuerdo en `profes` y vincula cada personalizado
-- (alumno) con su profe. Correr en Supabase → SQL Editor. Idempotente.
-- Solo admin edita (RLS de profes/alumnos ya existente).
-- =============================================================

alter table public.profes
  add column if not exists base_mensual        numeric not null default 0,   -- sueldo fijo mensual
  add column if not exists personalizados_100  integer not null default 0,   -- cuántos personalizados van al 100%
  add column if not exists split_resto         integer not null default 60,  -- % para el profe del resto (el otro va a Peak)
  add column if not exists acuerdo_notas       text;                         -- condiciones/extras (bonos, feriados, etc.)

-- Vincular cada personalizado (alumno) con el profe a cargo
alter table public.alumnos
  add column if not exists profe_id bigint references public.profes(id) on delete set null;
create index if not exists idx_alumnos_profe on public.alumnos(profe_id);
