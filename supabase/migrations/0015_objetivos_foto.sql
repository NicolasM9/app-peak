-- =============================================================
-- Peak Performance — 0015: objetivos y foto del alumno
--   objetivos: metas del alumno (se muestran en la ficha y el informe).
--   foto_path : ruta de la foto en Storage (bucket 'fotos').
-- Correr en Supabase → SQL Editor. Idempotente.
-- =============================================================

alter table public.alumnos add column if not exists objetivos text;
alter table public.alumnos add column if not exists foto_path text;
