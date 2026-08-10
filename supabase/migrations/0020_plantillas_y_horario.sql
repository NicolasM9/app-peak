-- =============================================================
-- Peak Performance — 0020: plantillas de bloque + horario del gimnasio
-- Dos cosas en una sola corrida. Pegar en Supabase → SQL Editor. Idempotente.
-- =============================================================

-- (1) PLANTILLAS DE BLOQUE reutilizables para Planificaciones.
--     Las usan y crean todos los profes (mismo permiso que planificaciones).
create table if not exists public.plantillas_bloque (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  ejercicios  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.plantillas_bloque enable row level security;
drop policy if exists plantillas_bloque_staff on public.plantillas_bloque;
create policy plantillas_bloque_staff on public.plantillas_bloque
  for all to authenticated using (true) with check (true);

-- (2) HORARIO DEL GIMNASIO para la Grilla del Calendario.
--     Se guarda en config (clave 'horario_gimnasio'). Escribir = solo admin
--     (policy config_admin ya existente). Agregamos SELECT de ESA fila a todo
--     el staff para que los profes vean la Grilla con el mismo rango horario.
drop policy if exists config_horario_read on public.config;
create policy config_horario_read on public.config
  for select to authenticated using (clave = 'horario_gimnasio');

-- Valor por defecto: gimnasio activo de 7:00 a 22:00 (editable desde la Grilla).
insert into public.config (clave, valor)
values ('horario_gimnasio', '{"inicio":"07:00","fin":"22:00"}'::jsonb)
on conflict (clave) do nothing;
