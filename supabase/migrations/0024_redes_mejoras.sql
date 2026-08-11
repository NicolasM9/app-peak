-- =============================================================
-- Peak Performance — 0024: mejoras de Redes.
--  (a) backlog: contenidos sin fecha (ideas sueltas)  → fecha pasa a opcional.
--  (b) checklist por contenido (grabar/editar/copy/subir) → jsonb pasos.
--  (c) meta mensual de contenido → columna en redes_metricas.
-- Pegar en Supabase → SQL Editor. Idempotente.
-- =============================================================

alter table public.contenidos alter column fecha drop not null;
alter table public.contenidos add column if not exists pasos jsonb not null default '{}'::jsonb;
alter table public.redes_metricas add column if not exists meta integer not null default 0;
