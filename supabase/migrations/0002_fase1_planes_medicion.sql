-- =============================================================
-- Peak Performance — Fase 1: planes personalizados + medición nutricional
--
-- Cómo correrlo:
--   Supabase → tu proyecto → SQL Editor → New query →
--   pegar TODO este archivo → Run.
-- Es idempotente: se puede correr más de una vez sin romper nada.
-- =============================================================

-- Planes personalizados (precio POR PERSONA)
insert into public.planes (nombre, precio_mensual, frecuencia_max) values
  ('Personalizado 1 persona · 1x semana',    90000, 1),
  ('Personalizado 1 persona · 2x semana',   105000, 2),
  ('Personalizado 1 persona · 3x semana',   120000, 3),
  ('Personalizado 2-3 personas · 1x semana',  70000, 1),
  ('Personalizado 2-3 personas · 2x semana',  85000, 2),
  ('Personalizado 2-3 personas · 3x semana',  97000, 3)
on conflict (nombre) do nothing;

-- Add-on de medición nutricional (Diego Sívori): marca por alumno (+$20.000/mes)
alter table public.alumnos
  add column if not exists medicion_nutricional boolean not null default false;
