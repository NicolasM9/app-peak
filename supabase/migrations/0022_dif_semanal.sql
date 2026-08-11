-- =============================================================
-- Peak Performance — 0022: diferencia de horas Nico ↔ Eze, semana a semana.
-- Cada fila = una semana con su diferencia (en turnos, 1.5 h c/u).
-- El total acumulado = suma de todas las filas. Solo admins.
-- Pegar en Supabase → SQL Editor. Idempotente.
-- =============================================================

create table if not exists public.dif_semanal (
  id         bigint generated always as identity primary key,
  fecha      date not null default current_date,   -- lunes de la semana registrada
  turnos     integer not null default 0,           -- con signo: + = Eze hizo más, − = Nico hizo más
  nota       text,
  created_at timestamptz not null default now()
);

alter table public.dif_semanal enable row level security;
drop policy if exists dif_semanal_admin on public.dif_semanal;
create policy dif_semanal_admin on public.dif_semanal
  for all to authenticated using (es_admin()) with check (es_admin());

create index if not exists dif_semanal_fecha_idx on public.dif_semanal (fecha);

-- Semilla: el arrastre actual (lo que venían debiéndose) pasa a ser la primera fila.
-- Sale del valor que ya estaba en config.dif_nico_eze (Eze +N o Nico +N). Solo si la tabla está vacía.
insert into public.dif_semanal (fecha, turnos, nota)
select current_date,
       case when (valor->>'favor') = 'Nico' then -((valor->>'turnos')::int)
            when (valor->>'favor') = 'Eze'  then  ((valor->>'turnos')::int)
            else 0 end,
       'Arrastre inicial'
from public.config
where clave = 'dif_nico_eze'
  and not exists (select 1 from public.dif_semanal);
