-- =============================================================
-- Peak Performance — Alumnos: ficha de investigación
-- (estado/lesión, mediciones antropométricas, testeos, notas)
-- Correr en Supabase → SQL Editor. Idempotente.
-- Estos datos son de ENTRENAMIENTO (no plata): los ve/edita todo el staff.
-- =============================================================

-- 1) Estado físico / lesión (en la ficha del alumno)
alter table public.alumnos
  add column if not exists estado_fisico text not null default 'sano'
    check (estado_fisico in ('sano', 'lesionado', 'recuperacion')),
  add column if not exists lesion_detalle text,
  add column if not exists lesion_desde date;

-- 2) Mediciones antropométricas (con Diego): % + archivo (PDF/Excel)
create table if not exists public.mediciones (
  id             bigint generated always as identity primary key,
  alumno_id      bigint not null references public.alumnos(id) on delete cascade,
  fecha          date not null,
  masa_muscular  numeric(5,2),   -- % masa muscular
  masa_adiposa   numeric(5,2),   -- % masa adiposa
  archivo_path   text,           -- ruta del PDF/Excel en Supabase Storage
  archivo_nombre text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_mediciones_alumno on public.mediciones(alumno_id);

-- 3) Testeos físicos (fuerza en kg, salto en cm, o personalizados)
create table if not exists public.testeos (
  id         bigint generated always as identity primary key,
  alumno_id  bigint not null references public.alumnos(id) on delete cascade,
  fecha      date not null,
  categoria  text,               -- 'fuerza' | 'salto' | 'otro'
  test       text not null,      -- ej: 'Sentadilla', 'CMJ'
  valor      numeric(10,2),
  unidad     text,               -- 'kg' | 'cm' | 'reps'
  created_at timestamptz not null default now()
);
create index if not exists idx_testeos_alumno on public.testeos(alumno_id);

-- 4) Notas de los profes (bitácora por alumno)
create table if not exists public.notas (
  id         bigint generated always as identity primary key,
  alumno_id  bigint not null references public.alumnos(id) on delete cascade,
  autor      text,               -- nombre del profe que la escribió
  texto      text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_notas_alumno on public.notas(alumno_id);

-- RLS: datos de entrenamiento → los ve/edita TODO el staff (profes incluidos)
alter table public.mediciones enable row level security;
alter table public.testeos    enable row level security;
alter table public.notas      enable row level security;

drop policy if exists mediciones_staff on public.mediciones;
create policy mediciones_staff on public.mediciones
  for all to authenticated using (true) with check (true);

drop policy if exists testeos_staff on public.testeos;
create policy testeos_staff on public.testeos
  for all to authenticated using (true) with check (true);

drop policy if exists notas_staff on public.notas;
create policy notas_staff on public.notas
  for all to authenticated using (true) with check (true);
