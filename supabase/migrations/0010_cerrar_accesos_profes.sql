-- =============================================================
-- Peak Performance — 0010: cerrar accesos de los profes
-- Ahora que los profes tienen login, blindamos la info sensible
-- TAMBIÉN en la base (no solo en las pantallas):
--   • Sueldos (tabla profes): cada profe ve SOLO su ficha; admin ve todo.
--   • Ficha de alumnos (mediciones/testeos/notas): SOLO admin.
--   • Archivos de mediciones (Storage): SOLO admin.
-- Y creamos una vista pública con los nombres de los profes, para que
-- Calendario y Horas puedan mostrarlos sin exponer los sueldos.
-- Correr en Supabase → SQL Editor. Idempotente.
-- =============================================================

-- 1) PROFES: cada uno ve su propia ficha; los admin ven todas.
--    (Antes: cualquiera autenticado leía todo, incluidos los sueldos.)
drop policy if exists profes_select on public.profes;
create policy profes_select on public.profes
  for select to authenticated
  using (es_admin() or user_id = auth.uid());

-- 2) Vista pública SOLO con lo no sensible (sin sueldos), para mostrar
--    los nombres de los profes en Calendario y Horas.
create or replace view public.profes_publico
with (security_invoker = false) as   -- corre como dueño: puentea la RLS de profes y devuelve solo estas columnas
  select id, nombre, rol from public.profes;
revoke all on public.profes_publico from anon;
grant select on public.profes_publico to authenticated;

-- 3) FICHA DE ALUMNOS (info confidencial) → SOLO admin (leer/escribir/borrar).
drop policy if exists mediciones_staff on public.mediciones;
drop policy if exists mediciones_admin on public.mediciones;
create policy mediciones_admin on public.mediciones
  for all to authenticated using (es_admin()) with check (es_admin());

drop policy if exists testeos_staff on public.testeos;
drop policy if exists testeos_admin on public.testeos;
create policy testeos_admin on public.testeos
  for all to authenticated using (es_admin()) with check (es_admin());

drop policy if exists notas_staff on public.notas;
drop policy if exists notas_admin on public.notas;
create policy notas_admin on public.notas
  for all to authenticated using (es_admin()) with check (es_admin());

-- 4) ARCHIVOS de mediciones (Storage): SOLO admin sube / ve / borra.
drop policy if exists mediciones_bucket_select on storage.objects;
create policy mediciones_bucket_select on storage.objects
  for select to authenticated
  using (bucket_id = 'mediciones' and public.es_admin());

drop policy if exists mediciones_bucket_insert on storage.objects;
create policy mediciones_bucket_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mediciones' and public.es_admin());

drop policy if exists mediciones_bucket_delete on storage.objects;
create policy mediciones_bucket_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'mediciones' and public.es_admin());
