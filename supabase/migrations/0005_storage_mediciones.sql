-- =============================================================
-- Peak Performance — Storage para archivos de mediciones
-- Crea el "cajón" (bucket) donde se guardan los PDF/Excel de Diego.
-- Correr en Supabase → SQL Editor. Idempotente.
-- El bucket es PRIVADO: los archivos se ven con enlaces temporales
-- generados por la app (solo staff logueado).
-- =============================================================

-- 1) Bucket privado 'mediciones'
insert into storage.buckets (id, name, public)
values ('mediciones', 'mediciones', false)
on conflict (id) do nothing;

-- 2) Políticas: el staff autenticado puede subir / ver / borrar
--    únicamente dentro de este bucket.
drop policy if exists mediciones_bucket_select on storage.objects;
create policy mediciones_bucket_select on storage.objects
  for select to authenticated
  using (bucket_id = 'mediciones');

drop policy if exists mediciones_bucket_insert on storage.objects;
create policy mediciones_bucket_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mediciones');

drop policy if exists mediciones_bucket_delete on storage.objects;
create policy mediciones_bucket_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'mediciones');
