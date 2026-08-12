-- =============================================================
-- Peak Performance — 0025: franja horaria del alumno (AM / PM / Ambas).
-- Se elige en la ficha del alumno y se cuenta en Estadísticas.
-- Pegar en Supabase → SQL Editor. Idempotente.
-- =============================================================

alter table public.alumnos add column if not exists franja text
  check (franja in ('am', 'pm', 'ambas'));
