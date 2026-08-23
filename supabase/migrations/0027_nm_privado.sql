-- =============================================================
-- Peak Performance — 0027: pestaña "NM" (privada, SOLO Nico).
--
-- Espacio personal de Nico. NADA de esto se cruza con Peak:
-- son tablas nuevas (prefijo nm_), no tocan alumnos/pagos/facturación.
-- Acceso: helper es_nico() → solo el usuario admin cuyo nombre empieza
-- con "Nico". Ni Eze ni los profes lo ven (ni en pantalla ni en la base).
--
-- Pegar en Supabase → SQL Editor. Idempotente.
-- =============================================================

-- ---- Helper: es_nico() (modelado igual que es_admin) ----
create or replace function public.es_nico()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profes
    where user_id = auth.uid() and rol = 'admin' and lower(nombre) like 'nico%'
  );
$$;
revoke all on function public.es_nico() from public;
grant execute on function public.es_nico() to authenticated;

-- ---- 1) Alumnos ONLINE de Nico (aparte de los de Peak) ----
create table if not exists public.nm_alumnos (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  deporte    text,
  contacto   text,
  objetivo   text,
  activo     boolean not null default true,
  inicio     date,
  nota       text,
  created_at timestamptz not null default now()
);

-- ---- 2) Pagos de los alumnos online (NO tocan la facturación de Peak) ----
create table if not exists public.nm_pagos (
  id           bigint generated always as identity primary key,
  nm_alumno_id bigint not null references public.nm_alumnos(id) on delete cascade,
  mes          text,                       -- 'YYYY-MM'
  monto        numeric(12,2) not null default 0,
  fecha_pago   date,
  medio        text,
  nota         text,
  created_at   timestamptz not null default now()
);

-- ---- 3) Progreso / métricas por alumno (flexible: cualquier métrica en el tiempo) ----
create table if not exists public.nm_progreso (
  id           bigint generated always as identity primary key,
  nm_alumno_id bigint not null references public.nm_alumnos(id) on delete cascade,
  fecha        date not null default current_date,
  metrica      text not null,              -- ej: 'Sentadilla', 'Salto', 'Peso'
  valor        numeric,
  unidad       text,                       -- ej: 'kg', 'cm'
  nota         text,
  created_at   timestamptz not null default now()
);

-- ---- 4) Objetivos por alumno ----
create table if not exists public.nm_objetivos (
  id           bigint generated always as identity primary key,
  nm_alumno_id bigint references public.nm_alumnos(id) on delete cascade,
  texto        text not null,
  cumplido     boolean not null default false,
  fecha        date,
  created_at   timestamptz not null default now()
);

-- ---- 5) Archivos (reportes de lesiones, partidos, planificación macro) ----
-- Metadata acá; el archivo real va al bucket 'nm-archivos' de Storage.
create table if not exists public.nm_archivos (
  id           bigint generated always as identity primary key,
  categoria    text not null default 'otro',   -- lesiones / partidos / planificacion / otro
  titulo       text,
  path         text,                            -- ruta en Storage
  nm_alumno_id bigint references public.nm_alumnos(id) on delete set null,
  fecha        date default current_date,
  nota         text,
  created_at   timestamptz not null default now()
);

-- ---- 6) Ingresos personales de Nico (Hacoaj, sueldo, online). Aparte de Peak ----
create table if not exists public.nm_ingresos (
  id         bigint generated always as identity primary key,
  mes        text,                          -- 'YYYY-MM'
  concepto   text not null,                 -- 'Hacoaj' / 'Online' / 'Otro'
  monto      numeric(12,2) not null default 0,
  nota       text,
  created_at timestamptz not null default now()
);

-- ---- 7) Calendario de contenido (semana a semana, estructura fija editable) ----
create table if not exists public.nm_contenido (
  id         bigint generated always as identity primary key,
  fecha      date not null,
  titulo     text,                          -- la idea/contenido de ese día
  estado     text not null default 'idea',  -- idea / listo / subido
  nota       text,
  created_at timestamptz not null default now()
);

-- ---- 8) Datos sueltos NM (plantilla semanal de contenido, notas de Hacoaj, etc.) ----
create table if not exists public.nm_datos (
  clave      text primary key,
  valor      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---- RLS: TODO solo Nico ----
alter table public.nm_alumnos   enable row level security;
alter table public.nm_pagos     enable row level security;
alter table public.nm_progreso  enable row level security;
alter table public.nm_objetivos enable row level security;
alter table public.nm_archivos  enable row level security;
alter table public.nm_ingresos  enable row level security;
alter table public.nm_contenido enable row level security;
alter table public.nm_datos     enable row level security;

drop policy if exists nm_alumnos_nico   on public.nm_alumnos;
drop policy if exists nm_pagos_nico      on public.nm_pagos;
drop policy if exists nm_progreso_nico   on public.nm_progreso;
drop policy if exists nm_objetivos_nico  on public.nm_objetivos;
drop policy if exists nm_archivos_nico   on public.nm_archivos;
drop policy if exists nm_ingresos_nico   on public.nm_ingresos;
drop policy if exists nm_contenido_nico  on public.nm_contenido;
drop policy if exists nm_datos_nico      on public.nm_datos;

create policy nm_alumnos_nico   on public.nm_alumnos   for all to authenticated using (es_nico()) with check (es_nico());
create policy nm_pagos_nico     on public.nm_pagos     for all to authenticated using (es_nico()) with check (es_nico());
create policy nm_progreso_nico  on public.nm_progreso  for all to authenticated using (es_nico()) with check (es_nico());
create policy nm_objetivos_nico on public.nm_objetivos for all to authenticated using (es_nico()) with check (es_nico());
create policy nm_archivos_nico  on public.nm_archivos  for all to authenticated using (es_nico()) with check (es_nico());
create policy nm_ingresos_nico  on public.nm_ingresos  for all to authenticated using (es_nico()) with check (es_nico());
create policy nm_contenido_nico on public.nm_contenido for all to authenticated using (es_nico()) with check (es_nico());
create policy nm_datos_nico     on public.nm_datos     for all to authenticated using (es_nico()) with check (es_nico());

-- ---- Storage privado para archivos NM (bucket + policy solo Nico) ----
insert into storage.buckets (id, name, public)
values ('nm-archivos', 'nm-archivos', false)
on conflict (id) do nothing;

drop policy if exists nm_archivos_storage on storage.objects;
create policy nm_archivos_storage on storage.objects
  for all to authenticated
  using (bucket_id = 'nm-archivos' and es_nico())
  with check (bucket_id = 'nm-archivos' and es_nico());

-- ---- Índices ----
create index if not exists idx_nm_pagos_alu     on public.nm_pagos(nm_alumno_id);
create index if not exists idx_nm_progreso_alu  on public.nm_progreso(nm_alumno_id);
create index if not exists idx_nm_objetivos_alu on public.nm_objetivos(nm_alumno_id);
create index if not exists idx_nm_contenido_fecha on public.nm_contenido(fecha);
