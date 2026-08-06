-- =============================================================
-- Peak Performance — 0011: alumno "personalizado directo"
-- Marca los alumnos que le pagan 100% directo al profe: NO suman a la
-- facturación de Peak ni aparecen en los cobros del mes (esa plata no
-- pasa por el centro). Siguen siendo alumnos normales (ficha, calendario…).
-- Correr en Supabase → SQL Editor. Idempotente.
-- =============================================================

alter table public.alumnos
  add column if not exists paga_directo_profe boolean not null default false;

-- Jorge López es personalizado directo (le paga al profe, no a Peak)
update public.alumnos
  set paga_directo_profe = true
  where nombre ilike 'jorge lopez' and paga_directo_profe = false;
