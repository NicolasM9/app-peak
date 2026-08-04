-- =============================================================
-- Peak Performance — Calendario semanal de entrenamientos
-- Tabla de "sesiones": quién entrena cada día, en qué horario,
-- con qué profe y qué alumnos. Estilo Google Calendar, pero propio.
-- Correr en Supabase → SQL Editor. Idempotente.
-- =============================================================

create table if not exists public.sesiones (
  id           bigint generated always as identity primary key,
  dia          text not null
               check (dia in ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
  hora_inicio  time not null,
  hora_fin     time not null,
  titulo       text not null,                 -- ej: "Peak AM", "Personalizado Octi", "Nico filmación"
  tipo         text not null default 'otro'   -- define el color en la app
               check (tipo in ('peak','personalizado','grupo','filmacion','otro')),
  profe_id     bigint references public.profes(id) on delete set null,
  alumnos      text,                          -- texto libre por ahora: "Felix - Juli"
  visibilidad  text not null default 'todos'  -- 'todos' lo ve el staff; 'admin' solo Nico/Eze
               check (visibilidad in ('todos','admin')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_sesiones_dia on public.sesiones(dia);

-- RLS: el staff ve las sesiones 'todos'; los admin ven todo. Solo admin edita.
alter table public.sesiones enable row level security;

drop policy if exists sesiones_select on public.sesiones;
create policy sesiones_select on public.sesiones
  for select to authenticated
  using (es_admin() or visibilidad = 'todos');

drop policy if exists sesiones_admin_write on public.sesiones;
create policy sesiones_admin_write on public.sesiones
  for all to authenticated
  using (es_admin()) with check (es_admin());
