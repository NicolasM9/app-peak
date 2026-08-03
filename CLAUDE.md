# Peak Performance — App de gestión interna

## Proyecto
App de gestión interna de **Peak Performance**, un centro de entrenamiento en CABA.
Reemplaza el manejo actual, hoy disperso en varios Excel.

**No** reemplaza la app de turnos que usan los alumnos (**Turnos Web 2.0**), que sigue
funcionando por separado.

## Usuarios
Solo uso interno del staff. Dos niveles de acceso:

- **Admin** (Nico y Eze, dueños): ven y editan todo.
- **Profe** (Octavio, Gastón, Ailén): ven el calendario, sus propios días/horarios y
  eventos importantes. **No** ven pagos ni información confidencial de alumnos.

## Stack
- **Frontend:** React + Vite.
- **Backend:** Supabase (Postgres + Auth).
- Sin app store: corre en el navegador del celular (mobile-first).
- Toda la interfaz en **español de Argentina** (voseo).

## Identidad visual
- **Colores:** azul cobalto `#1a4fa3`, azul marino oscuro `#12151d`, blanco.
- **Tipografías:** Anton para títulos, Barlow para texto.
- **Logo:** una "A" en forma de montaña azul con una mancuerna arriba.

## Desarrollo por fases
No hacerlas todas juntas. Un commit de Git al terminar cada fase.

- **Fase 0:** modelo de datos en Supabase.
- **Fase 1:** ABM de alumnos + gestión de pagos.
- **Fase 2:** calendario, roster semanal de profes y vacaciones.
- **Fase 3:** armado de rutinas (bloque grupal).

## Estado del proyecto (al 2026-08-03)
Lo que ya está hecho y funcionando:

- **Fase 0 — Datos:** esquema + RLS aplicados en Supabase (planes, profes, alumnos,
  pagos, gastos, mediciones, testeos, notas).
- **Fase 1 — Alumnos + Pagos:** login, ABM de alumnos y registro de pagos. 74 alumnos
  activos importados desde el Excel.
- **Rediseño:** barra lateral con 7 solapas (Inicio, Calendario, Alumnos,
  Planificaciones, Horas, Pagos [admin], Acuerdos profes [admin]) + pantalla de Inicio.
- **Pagos:** facturación esperada + gastos mensuales + resultado (repartido entre los dueños).
- **Ficha del alumno (investigación):** estado físico/lesión, notas de los profes,
  mediciones (% masa muscular y adiposa + subida de PDF/Excel a Supabase Storage con
  ver/descargar) y testeos (fuerza en kg, salto en cm y tests personalizados).

Pendiente: Calendario, Planificaciones, Horas + vacaciones, Acuerdos profes, publicar la
app en una URL pública y crear los logins del resto del staff.

Entorno: Node portátil en `~/.peak-tools/node` (no está en el PATH del sistema); la app
corre con Vite en el puerto 5173.

## Convenciones
- Git desde el inicio; commit al cerrar cada fase.
- El acceso de Profe nunca debe exponer datos de pagos ni información confidencial de
  alumnos (aplicar tanto en UI como en las políticas RLS de Supabase).
