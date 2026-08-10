-- =============================================================
-- Peak Performance — 0018: los profes gestionan LO SUYO
--
-- Hasta ahora el profe solo LEÍA sus vacaciones y su ficha; escribir era
-- admin-only. Este migración habilita, sin abrir nada de más:
--   * vacaciones: el profe agrega/edita/borra LAS SUYAS (profe_id = mi_profe_id()).
--   * sesiones:   el profe gestiona SUS personalizados (tipo='personalizado'
--                 y profe_id = mi_profe_id()). NO puede tocar sesiones Peak
--                 ni asignarse otras (el CHECK lo impide).
-- Los admin siguen viendo/editando todo (políticas previas intactas).
-- Idempotente. Correr en Supabase → SQL Editor.
-- =============================================================

-- Vacaciones propias
drop policy if exists vacaciones_profe_write on public.vacaciones;
create policy vacaciones_profe_write on public.vacaciones
  for all to authenticated
  using (profe_id = mi_profe_id())
  with check (profe_id = mi_profe_id());

-- Personalizados propios en el calendario
drop policy if exists sesiones_profe_pers on public.sesiones;
create policy sesiones_profe_pers on public.sesiones
  for all to authenticated
  using (tipo = 'personalizado' and profe_id = mi_profe_id())
  with check (tipo = 'personalizado' and profe_id = mi_profe_id());
