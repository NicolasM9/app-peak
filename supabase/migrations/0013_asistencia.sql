-- =============================================================
-- Peak Performance — 0013: Roster estructurado + asistencia por fecha
--
-- La tabla `sesiones` es la "semana tipo" (se repite cada semana) y hoy los
-- alumnos de cada sesión son texto libre. Para tomar lista de verdad:
--
--   sesion_alumnos : qué alumnos REALES integran cada sesión de la semana.
--   asistencias    : quién vino / faltó a una sesión en una FECHA puntual.
--
-- Solo admin (mismo criterio que Alumnos/Pagos: el profe no ve datos de
-- alumnos). Correr en Supabase → SQL Editor. Idempotente.
-- =============================================================

create table if not exists public.sesion_alumnos (
  sesion_id bigint not null references public.sesiones(id) on delete cascade,
  alumno_id bigint not null references public.alumnos(id) on delete cascade,
  primary key (sesion_id, alumno_id)
);

create table if not exists public.asistencias (
  id         bigint generated always as identity primary key,
  sesion_id  bigint not null references public.sesiones(id) on delete cascade,
  alumno_id  bigint not null references public.alumnos(id) on delete cascade,
  fecha      date not null,
  presente   boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sesion_id, alumno_id, fecha)
);
create index if not exists idx_asist_alumno_fecha on public.asistencias(alumno_id, fecha);
create index if not exists idx_asist_sesion_fecha on public.asistencias(sesion_id, fecha);

alter table public.sesion_alumnos enable row level security;
alter table public.asistencias    enable row level security;

drop policy if exists sesion_alumnos_admin on public.sesion_alumnos;
create policy sesion_alumnos_admin on public.sesion_alumnos
  for all to authenticated using (es_admin()) with check (es_admin());

drop policy if exists asistencias_admin on public.asistencias;
create policy asistencias_admin on public.asistencias
  for all to authenticated using (es_admin()) with check (es_admin());
