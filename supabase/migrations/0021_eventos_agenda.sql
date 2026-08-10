-- =============================================================
-- Peak Performance — 0021: agenda mensual privada (solo admins)
-- Eventos con fecha (feriados y a quién le toca, campamentos, vacaciones,
-- partidos, reuniones, pretemporada, etc.). Pegar en Supabase → SQL Editor.
-- Idempotente.
-- =============================================================

create table if not exists public.eventos (
  id         bigint generated always as identity primary key,
  titulo     text not null,
  tipo       text not null default 'evento'
             check (tipo in ('feriado','campamento','vacaciones','partido','evento','otro')),
  fecha      date not null,
  fecha_fin  date,
  profe_id   bigint references public.profes(id) on delete set null,
  nota       text,
  created_at timestamptz not null default now()
);

alter table public.eventos enable row level security;
drop policy if exists eventos_admin on public.eventos;
create policy eventos_admin on public.eventos
  for all to authenticated using (es_admin()) with check (es_admin());

create index if not exists eventos_fecha_idx on public.eventos (fecha);
