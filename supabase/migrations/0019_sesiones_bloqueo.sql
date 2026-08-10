-- =============================================================
-- Peak Performance — 0019: tipo de sesión "bloqueo"
--
-- Para el calendario interactivo (Fase B): poder "bloquear" un turno
-- (marcar una franja como no disponible) crea una sesión tipo 'bloqueo'.
-- Sólo suma un valor permitido al CHECK de sesiones.tipo. Idempotente.
-- Correr en Supabase → SQL Editor.
-- =============================================================

alter table public.sesiones drop constraint if exists sesiones_tipo_check;
alter table public.sesiones add constraint sesiones_tipo_check
  check (tipo in ('peak','personalizado','grupo','filmacion','bloqueo','otro'));
