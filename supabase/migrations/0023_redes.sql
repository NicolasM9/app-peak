-- =============================================================
-- Peak Performance — 0023: pestaña "Redes" (calendario de contenido + KPIs).
-- Privado, solo admins. Pegar en Supabase → SQL Editor. Idempotente.
-- =============================================================

-- Contenido planificado por día (historias / publicaciones / ideas).
create table if not exists public.contenidos (
  id         bigint generated always as identity primary key,
  fecha      date not null,
  titulo     text not null,
  tipo       text not null default 'publicacion'
             check (tipo in ('historia','publicacion','ambas')),
  estado     text not null default 'idea'
             check (estado in ('idea','listo','subido')),
  nota       text,
  created_at timestamptz not null default now()
);

alter table public.contenidos enable row level security;
drop policy if exists contenidos_admin on public.contenidos;
create policy contenidos_admin on public.contenidos
  for all to authenticated using (es_admin()) with check (es_admin());

create index if not exists contenidos_fecha_idx on public.contenidos (fecha);

-- Métricas manuales del mes (ej: consultas para entrenar que llegan por mensaje).
create table if not exists public.redes_metricas (
  mes        text primary key,          -- 'YYYY-MM'
  consultas  integer not null default 0, -- gente que escribió para entrenar
  nota       text,
  updated_at timestamptz not null default now()
);

alter table public.redes_metricas enable row level security;
drop policy if exists redes_metricas_admin on public.redes_metricas;
create policy redes_metricas_admin on public.redes_metricas
  for all to authenticated using (es_admin()) with check (es_admin());
