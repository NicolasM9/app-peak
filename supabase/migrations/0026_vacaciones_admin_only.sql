-- =============================================================
-- Peak Performance — 0026: vacaciones 100% privadas (solo admins).
--
-- Hasta ahora un profe podía LEER las suyas (y en Fase A escribirlas).
-- Nico pidió que las vacaciones las vean/gestionen SOLO Nico y Eze.
--   * Lectura: solo es_admin().
--   * Escritura de profe (de 0018): se elimina.
--   * Escritura de admin (vacaciones_admin_write): se mantiene.
-- Pegar en Supabase → SQL Editor. Idempotente.
-- =============================================================

-- Lectura solo admin (antes: es_admin() or profe_id = mi_profe_id())
drop policy if exists vacaciones_select on public.vacaciones;
create policy vacaciones_select on public.vacaciones
  for select to authenticated
  using (es_admin());

-- El profe ya no escribe sus vacaciones
drop policy if exists vacaciones_profe_write on public.vacaciones;
