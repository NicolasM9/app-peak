-- =============================================================
-- Peak Performance — Personalizados del acuerdo (lista por profe)
-- Guarda, por profe, la lista de personalizados que cobra:
--   [{ "nombre": "...", "monto": 90000, "al100": true }, ...]
-- Van acá (no en la lista de alumnos) para que NO sumen a la
-- facturación de Peak: esa plata va directo al profe.
-- Correr en Supabase → SQL Editor. Idempotente.
-- =============================================================

alter table public.profes
  add column if not exists personalizados jsonb not null default '[]'::jsonb;
