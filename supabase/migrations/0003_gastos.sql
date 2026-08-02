-- =============================================================
-- Peak Performance — Pagos: tabla de GASTOS del centro (solo admin)
--
-- Cómo correrlo:
--   Supabase → tu proyecto → SQL Editor → New query →
--   pegar TODO este archivo → Run.
-- Es idempotente: se puede correr más de una vez sin romper nada.
-- =============================================================

create table if not exists public.gastos (
  id          bigint generated always as identity primary key,
  periodo     date not null,              -- primer día del mes al que corresponde (ej: 2026-08-01)
  categoria   text not null,
  monto       numeric(12,2) not null,
  descripcion text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_gastos_periodo on public.gastos(periodo);

-- Privacidad: SOLO admin (Nico/Eze) ven y editan gastos
alter table public.gastos enable row level security;
drop policy if exists gastos_admin_all on public.gastos;
create policy gastos_admin_all on public.gastos
  for all to authenticated using (es_admin()) with check (es_admin());
