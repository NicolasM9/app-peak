-- =============================================================
-- Peak Performance — 0014: fechas de alta y baja de alumnos
--
-- Para el resumen de "altas y bajas del mes" en Inicio necesitamos saber
-- CUÁNDO se dio de alta o de baja cada alumno.
--   fecha_alta: se setea al crear un alumno nuevo (desde la app).
--   fecha_baja: se setea cuando se lo marca inactivo (botón Baja).
--
-- No hacemos backfill: los alumnos importados quedan con fecha_alta NULL,
-- así no cuentan como "altas" de ningún mes (no eran altas nuevas).
-- Correr en Supabase → SQL Editor. Idempotente.
-- =============================================================

alter table public.alumnos add column if not exists fecha_alta date;
alter table public.alumnos add column if not exists fecha_baja date;
