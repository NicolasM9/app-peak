# Supabase — Peak Performance

## Cómo aplicar el esquema (Fase 0)

1. Entrá a [supabase.com](https://supabase.com) → tu proyecto.
2. Menú izquierdo → **SQL Editor** → **New query**.
3. Abrí `migrations/0001_fase0_schema.sql`, copiá **todo** y pegalo.
4. **Run** (o `Cmd/Ctrl + Enter`).
5. Verificá en **Table Editor** que aparezcan las 8 tablas y en **Database → Policies**
   que cada tabla tenga sus políticas.

El script es idempotente: se puede correr de nuevo sin romper nada.

## Activar los roles (¡paso obligatorio!)

La RLS distingue admin/profe por el usuario logueado. Recién cuando cada persona tiene
login en Supabase Auth **y** su fila de `profes` queda vinculada, empiezan a funcionar los
permisos. Sin esto, `es_admin()` da `false` para todos y nadie puede escribir desde la app
(desde el SQL Editor sí, porque corre como `postgres` y saltea la RLS).

1. **Authentication → Users → Add user** (o invitación por email) para cada persona del staff.
2. Copiá el **UUID** de cada usuario (columna `id` en la lista de Users).
3. En el **SQL Editor**, vinculá cada uno con su fila de `profes`:

   ```sql
   update public.profes set user_id = 'UUID-DE-NICO'    where nombre = 'Nico';
   update public.profes set user_id = 'UUID-DE-EZE'     where nombre = 'Eze';
   update public.profes set user_id = 'UUID-DE-OCTAVIO' where nombre = 'Octavio';
   -- ...y así con Gastón y Ailén
   ```

4. Actualizá también la antigüedad real de cada profe (hoy quedó en 0):

   ```sql
   update public.profes set antiguedad_anios = 4 where nombre = 'Octavio';  -- ejemplo
   ```

## Seguridad — claves

- La app (frontend) usa **solo la `anon` key**. Con ella, la RLS se aplica según el usuario
  logueado.
- La **`service_role` key saltea toda la RLS**: nunca va en el frontend ni en el repo. Solo
  para tareas de servidor/administración.

## Matriz de acceso (resumen)

| Tabla                 | Admin        | Profe                                   |
|-----------------------|--------------|-----------------------------------------|
| `planes`              | leer/escribir| leer                                    |
| `alumnos`             | leer/escribir| solo columnas no sensibles (vía vista)  |
| `pagos`               | leer/escribir| **sin acceso**                          |
| `profes`              | leer/escribir| leer                                    |
| `vacaciones`          | leer/escribir| leer **solo las propias**               |
| `turnos`              | leer/escribir| leer                                    |
| `rutinas`             | leer/escribir| leer/escribir                           |
| `eventos_calendario`  | leer/escribir| leer **solo `visibilidad = 'todos'`**   |

- Los profes leen alumnos por la vista **`alumnos_resumen`** (id, nombre, deporte, estado,
  modalidad). No ven teléfono, fecha de nacimiento, ajustes de precio ni plan.
- `eventos_calendario.visibilidad` arranca en `'admin'` (privado por defecto). Los eventos de
  plata (`pago_alquiler`, `pago_profes`, `aumento_precios`) se dejan así; feriados/eventos se
  marcan `'todos'` para que los vean los profes.
