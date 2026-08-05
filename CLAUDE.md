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

## Estado del proyecto (al 2026-08-05)
**Las 7 solapas están hechas y funcionando.** Migraciones aplicadas en Supabase: 0001–0010.
**App publicada** en `earnest-moonbeam-59f0d7.netlify.app` (Netlify; se actualiza arrastrando
la carpeta `dist/` a la pestaña Deploys del sitio).

- **Fase 0 — Datos:** esquema + RLS (planes, profes, alumnos, pagos, gastos, mediciones,
  testeos, notas, sesiones, planificaciones).
- **Fase 1 — Alumnos + Pagos:** login, ABM de alumnos, 74 alumnos importados.
- **Inicio:** resumen (alumnos activos, cobros, ingresos, próximos vencimientos).
- **Alumnos:** ABM + ficha de investigación (estado/lesión, notas, mediciones con % y
  PDF/Excel a Storage, testeos de fuerza/salto/custom).
- **Pagos [admin]:** facturación esperada + gastos (editables) + resultado. **Carga rápida**
  (pegar nombres → registrar varios; crear alumno nuevo y saltar a su ficha). El gasto
  "pago a profe" sale solo del sueldo base del acuerdo.
- **Calendario:** vista semanal de sesiones estilo Google (tabla `sesiones`), color por tipo,
  permiso por sesión.
- **Horas:** grilla de rotaciones semanal + total por profe + vacaciones (tablas `turnos`/`vacaciones`).
- **Acuerdos profes [admin]:** lo que cobra cada profe (base + personalizados 100%/60%); dueños excluidos.
- **Planificaciones:** rutinas por mes/semana/día (148 sesiones importadas del Excel 2026),
  Modo TV para la pantalla, ranking de ejercicios más usados.

**Logins del staff:** creados y conectados Eze (admin), Gastón y Ailén (profe), además de
Nico (admin). Se crean en Supabase → Authentication → Users (con "Auto Confirm") y se enlazan
a la ficha de `profes` por `user_id` (match por mail). **Falta solo Octavio** (pendiente su mail).

**Seguridad del rol profe (migración 0010):** un profe NO puede ver sueldos ajenos, mediciones,
testeos, notas ni pagos — cerrado en las pantallas (Sidebar/AppShell ocultan Inicio, Alumnos,
Pagos, Acuerdos) *y* en la base (RLS). Los nombres de profes para Calendario/Horas salen de la
vista `profes_publico` (sin sueldos). Verificado impersonando a un profe vía RLS.

Entorno: Node portátil en `~/.peak-tools/node` (no está en el PATH del sistema); la app
corre con Vite en el puerto 5173.

## Convenciones
- Git desde el inicio; commit al cerrar cada fase.
- El acceso de Profe nunca debe exponer datos de pagos ni información confidencial de
  alumnos (aplicar tanto en UI como en las políticas RLS de Supabase).
