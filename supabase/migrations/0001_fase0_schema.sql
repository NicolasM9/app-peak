-- =============================================================
-- Peak Performance — Fase 0: modelo de datos + RLS
--
-- Cómo correrlo:
--   Supabase → tu proyecto → SQL Editor → New query →
--   pegar TODO este archivo → Run.
-- Es idempotente: se puede correr más de una vez sin romper nada.
-- =============================================================


-- ============================================================
-- 1. TABLAS
-- ============================================================

-- Catálogo de planes (precio fijo por plan)
create table if not exists public.planes (
  id              bigint generated always as identity primary key,
  nombre          text not null unique,
  precio_mensual  numeric(12,2) not null,
  frecuencia_max  integer,          -- veces por semana; NULL = sin tope (pase libre) o no aplica
  created_at      timestamptz not null default now()
);

-- Staff: dueños (admin) y profesores (profe)
create table if not exists public.profes (
  id                bigint generated always as identity primary key,
  user_id           uuid unique references auth.users(id) on delete set null,  -- vínculo con Supabase Auth
  nombre            text not null,
  rol               text not null check (rol in ('admin','profe')),
  nivel_acceso      text check (nivel_acceso in ('total','limitado')),         -- descriptivo; la seguridad usa "rol"
  antiguedad_anios  integer not null default 0,                                -- para calcular semanas de vacaciones
  created_at        timestamptz not null default now()
);

-- Alumnos
create table if not exists public.alumnos (
  id                bigint generated always as identity primary key,
  nombre            text not null,
  fecha_nacimiento  date,
  deporte           text,           -- libre: deporte de origen o "rehabilitación post lesión/operación"
  telefono          text,
  estado            text not null default 'activo' check (estado in ('activo','inactivo')),
  plan_id           bigint references public.planes(id) on delete set null,
  ajuste_motivo     text,           -- ej: "referido de Jon", "baja frecuencia"
  ajuste_monto      numeric(12,2),  -- +/- sobre el precio del plan; el plan queda limpio
  modalidad_rutina  text not null default 'bloque_grupal'
                    check (modalidad_rutina in ('bloque_grupal','builderpro')),
  created_at        timestamptz not null default now()
);
create index if not exists idx_alumnos_plan_id on public.alumnos(plan_id);

-- Pagos  (INFO SENSIBLE — solo admin)
create table if not exists public.pagos (
  id           bigint generated always as identity primary key,
  alumno_id    bigint not null references public.alumnos(id) on delete restrict,  -- protege el historial financiero
  monto        numeric(12,2) not null,
  vencimiento  date not null,
  fecha_pago   date,               -- NULL = todavía no pagó
  metodo       text check (metodo in ('transferencia','efectivo')),
  estado       text not null default 'por_vencer'
               check (estado in ('al_dia','por_vencer','vencido')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_pagos_alumno_id on public.pagos(alumno_id);
create index if not exists idx_pagos_vencimiento on public.pagos(vencimiento);
create index if not exists idx_pagos_estado on public.pagos(estado);

-- Vacaciones de profes (incluye la compensación de excesos — dato sensible)
create table if not exists public.vacaciones (
  id                    bigint generated always as identity primary key,
  profe_id              bigint not null references public.profes(id) on delete cascade,
  inicio                date not null,
  fin                   date not null,
  dias_correspondientes integer,
  exceso                text,       -- cómo se compensan los días de más (pago a otro profe / devolución de horas)
  created_at            timestamptz not null default now()
);
create index if not exists idx_vacaciones_profe_id on public.vacaciones(profe_id);

-- Roster semanal: quién cubre cada franja
create table if not exists public.turnos (
  id         bigint generated always as identity primary key,
  profe_id   bigint not null references public.profes(id) on delete cascade,
  dia        text not null check (dia in ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
  horario    text not null,         -- ej: "18:00-20:00"
  horas      numeric(4,2) not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists idx_turnos_profe_id on public.turnos(profe_id);

-- Rutinas (bloque grupal / BuilderPro)
create table if not exists public.rutinas (
  id             bigint generated always as identity primary key,
  alumno_id      bigint not null references public.alumnos(id) on delete cascade,
  bloque_actual  text,
  semana_ciclo   smallint check (semana_ciclo between 1 and 4),
  modalidad      text check (modalidad in ('bloque_grupal','builderpro')),
  vigencia_desde date,
  created_at     timestamptz not null default now()
);
create index if not exists idx_rutinas_alumno_id on public.rutinas(alumno_id);

-- Eventos del calendario
create table if not exists public.eventos_calendario (
  id           bigint generated always as identity primary key,
  fecha        date not null,
  tipo         text not null
               check (tipo in ('feriado','vacaciones','pago_alquiler','pago_profes','aumento_precios','evento')),
  descripcion  text,
  visibilidad  text not null default 'admin'          -- fail-safe: privado por defecto
               check (visibilidad in ('todos','admin')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_eventos_fecha on public.eventos_calendario(fecha);


-- ============================================================
-- 2. FUNCIONES AUXILIARES PARA RLS
-- ============================================================
-- SECURITY DEFINER: corren con permisos del dueño y "puentean" la RLS
-- de PROFES. Sin esto, consultar PROFES dentro de una política de PROFES
-- causaría recursión infinita.

-- ¿El usuario logueado es admin?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profes
    where user_id = auth.uid() and rol = 'admin'
  );
$$;

-- id de PROFES del usuario logueado (para "ver lo mío")
create or replace function public.mi_profe_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profes where user_id = auth.uid();
$$;

revoke all on function public.es_admin() from public;
revoke all on function public.mi_profe_id() from public;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.mi_profe_id() to authenticated;


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
alter table public.planes             enable row level security;
alter table public.profes             enable row level security;
alter table public.alumnos            enable row level security;
alter table public.pagos              enable row level security;
alter table public.vacaciones         enable row level security;
alter table public.turnos             enable row level security;
alter table public.rutinas            enable row level security;
alter table public.eventos_calendario enable row level security;

-- ---- PLANES: lee todo el staff; escribe solo admin ----
drop policy if exists planes_select on public.planes;
create policy planes_select on public.planes
  for select to authenticated using (true);
drop policy if exists planes_admin_write on public.planes;
create policy planes_admin_write on public.planes
  for all to authenticated using (es_admin()) with check (es_admin());

-- ---- PROFES: lee todo el staff; escribe solo admin ----
drop policy if exists profes_select on public.profes;
create policy profes_select on public.profes
  for select to authenticated using (true);
drop policy if exists profes_admin_write on public.profes;
create policy profes_admin_write on public.profes
  for all to authenticated using (es_admin()) with check (es_admin());

-- ---- ALUMNOS: SOLO admin sobre la tabla base ----
-- (los profes leen columnas no sensibles vía la vista alumnos_resumen, más abajo)
drop policy if exists alumnos_admin_all on public.alumnos;
create policy alumnos_admin_all on public.alumnos
  for all to authenticated using (es_admin()) with check (es_admin());

-- ---- PAGOS: SOLO admin (lee y escribe). Los profes no acceden ----
drop policy if exists pagos_admin_all on public.pagos;
create policy pagos_admin_all on public.pagos
  for all to authenticated using (es_admin()) with check (es_admin());

-- ---- VACACIONES: admin ve/edita todo; el profe ve SOLO las suyas ----
drop policy if exists vacaciones_select on public.vacaciones;
create policy vacaciones_select on public.vacaciones
  for select to authenticated
  using (es_admin() or profe_id = mi_profe_id());
drop policy if exists vacaciones_admin_write on public.vacaciones;
create policy vacaciones_admin_write on public.vacaciones
  for all to authenticated using (es_admin()) with check (es_admin());

-- ---- TURNOS (roster): lee todo el staff; escribe solo admin ----
drop policy if exists turnos_select on public.turnos;
create policy turnos_select on public.turnos
  for select to authenticated using (true);
drop policy if exists turnos_admin_write on public.turnos;
create policy turnos_admin_write on public.turnos
  for all to authenticated using (es_admin()) with check (es_admin());

-- ---- RUTINAS: lee y escribe todo el staff (armar rutinas es tarea de los profes) ----
drop policy if exists rutinas_all on public.rutinas;
create policy rutinas_all on public.rutinas
  for all to authenticated using (true) with check (true);

-- ---- EVENTOS: admin ve todo; el profe ve solo visibilidad='todos'; escribe solo admin ----
drop policy if exists eventos_select on public.eventos_calendario;
create policy eventos_select on public.eventos_calendario
  for select to authenticated
  using (es_admin() or visibilidad = 'todos');
drop policy if exists eventos_admin_write on public.eventos_calendario;
create policy eventos_admin_write on public.eventos_calendario
  for all to authenticated using (es_admin()) with check (es_admin());


-- ============================================================
-- 4. VISTA de ALUMNOS para profes (oculta columnas sensibles)
-- ============================================================
-- Postgres RLS filtra FILAS, no COLUMNAS. Para que los profes vean
-- solo datos no sensibles del alumno, exponemos una vista con las
-- columnas seguras (sin teléfono, sin fecha de nacimiento, sin ajustes
-- de precio, sin plan). "deporte" SÍ se muestra: el profe necesita saber
-- si el alumno viene de una lesión/operación para entrenarlo seguro.
create or replace view public.alumnos_resumen
with (security_invoker = false) as   -- corre como dueño: puentea RLS y devuelve las columnas seguras
  select id, nombre, deporte, estado, modalidad_rutina
  from public.alumnos;

revoke all on public.alumnos_resumen from anon;
grant select on public.alumnos_resumen to authenticated;


-- ============================================================
-- 5. DATOS INICIALES
-- ============================================================

-- Planes  (⚠️ revisar frecuencia_max de "Semanal" y el sentido de "Por día")
insert into public.planes (nombre, precio_mensual, frecuencia_max) values
  ('Básico',  75000, 3),      -- hasta 3x semana
  ('Full',    82000, null),   -- pase libre
  ('Semanal', 35000, 1),      -- ⚠️ asumido 1x semana — confirmar
  ('Online',  60000, 1),      -- incluye 1x semana presencial (resto por BuilderPro)
  ('Por día', 18000, null)    -- ⚠️ es por visita, no mensual — confirmar
on conflict (nombre) do nothing;

-- Staff  (user_id se completa después, cuando cada uno tenga login en Supabase Auth)
insert into public.profes (nombre, rol, nivel_acceso, antiguedad_anios)
select v.nombre, v.rol, v.nivel_acceso, v.antiguedad_anios
from (values
  ('Nico',    'admin', 'total',    0),
  ('Eze',     'admin', 'total',    0),
  ('Octavio', 'profe', 'limitado', 0),
  ('Gastón',  'profe', 'limitado', 0),
  ('Ailén',   'profe', 'limitado', 0)
) as v(nombre, rol, nivel_acceso, antiguedad_anios)
where not exists (select 1 from public.profes p where p.nombre = v.nombre);
