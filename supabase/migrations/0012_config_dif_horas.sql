-- =============================================================
-- Peak Performance — 0012: config general (clave/valor) para ajustes
-- que SOLO ven los admins. Se usa para el "arrastre" de la diferencia de
-- turnos entre Nico y Eze (lo que venían debiéndose antes de esta semana).
-- Correr en Supabase → SQL Editor. Idempotente.
-- =============================================================

create table if not exists public.config (
  clave      text primary key,
  valor      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.config enable row level security;
drop policy if exists config_admin on public.config;
create policy config_admin on public.config
  for all to authenticated using (es_admin()) with check (es_admin());

-- Arrastre inicial: Eze estaba +14 turnos respecto de Nico antes de esta semana
insert into public.config (clave, valor)
values ('dif_nico_eze', '{"favor":"Eze","turnos":14}'::jsonb)
on conflict (clave) do nothing;
