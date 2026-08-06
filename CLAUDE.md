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

## Estado del proyecto (al 2026-08-06)
**Las 7 solapas están hechas y funcionando.** Migraciones aplicadas en Supabase: 0001–0013
(0013 = asistencia, aplicada el 2026-08-06). **App publicada** en `earnest-moonbeam-59f0d7.netlify.app`
(Netlify; se actualiza arrastrando la carpeta `dist/` a la pestaña Deploys del sitio). **Pendiente:
subir el `dist/` nuevo** (asistencia + evolución + teléfonos + pulido) para que la web los tenga.

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

**Mejoras recientes (roadmap post-revisión, 2026-08-06):**
- **Cobros del mes + WhatsApp** en Pagos: lista automática de quién debe/pagó (modelo *virtual*:
  no genera filas de pago, cruza alumnos activos con los pagos cobrados del mes), botón WhatsApp
  por deudor (`waLink` en `domain.js`) y "Pagado" que **tilda en el lugar sin refrescar**.
- **Inicio accionable:** "Deben este mes" con el mismo cálculo que Pagos, deudores clickeables →
  ficha, cumpleaños del mes. El pago a **Diego** (mediciones × $20.000) suma solo a los gastos.
- **Personalizado directo** (migración 0011, `alumnos.paga_directo_profe`): un alumno que le paga
  100% al profe NO suma a la facturación ni a los cobros de Peak (tilde en la ficha). Ej: Jorge López.
- **"Mi Peak"** (inicio propio del profe): su acuerdo del mes, sus horas/semana y sus días/sesiones;
  solo ve lo suyo. Sidebar muestra "Mi Peak" (profe) / "Inicio" (admin).
- **Horas:** "carga rápida de la semana" (elegir profe + AM/PM o turnos sueltos + días → agregar/quitar
  todo junto) y tarjeta **Diferencia Nico↔Eze** (solo admin) con arrastre editable — migración 0012,
  tabla `config` (clave/valor, admin-only); arrastre actual = Eze +14 turnos.
- **Asistencia [admin]** (migración 0013, tablas `sesion_alumnos` + `asistencias`): dentro de cada
  sesión del Calendario se arma el **roster** (alumnos reales, reemplaza el texto libre) y se **toma
  lista** por fecha (✓ Vino / ✕ Faltó, upsert por `sesion_id+alumno_id+fecha`). La ficha del alumno
  muestra "vino X veces este mes · última vez". Solo admin (RLS `es_admin()`). Componente
  `SesionAlumnos.jsx` colgado de `SesionForm` al editar.
- **Evolución del alumno** (sin migración; usa mediciones/testeos): sección en la ficha con
  mini-gráficos SVG propios (sin librerías). Muestra masa muscular ↑ / adiposa ↓ (variación
  primero→último + sparkline) y cada testeo agrupado por ejercicio con su progreso (delta + % +
  sparkline). Verde = mejoró, rojo = empeoró. Componente `Evolucion.jsx`.
- **Carga masiva de teléfonos** (sin migración): botón "☎ Teléfonos" en Alumnos → pegás
  "nombre + teléfono" por línea, matchea contra los alumnos (util `src/lib/match.js`, reusado de
  la carga de pagos), confirmás/corregís y guarda todo junto. Destraba el WhatsApp de Pagos/Inicio.
  Componente `CargaTelefonos.jsx`. **Falta que Nico cargue los números.**

**Pendientes:** teléfonos de los alumnos (para que sirva WhatsApp), asignar el profe a cada sesión del
Calendario (para llenar "Mis días"), login de Octavio, y montar **auto-deploy** (GitHub + Netlify) para
no arrastrar `dist/` a mano — hoy no puedo publicar yo porque requiere el login de Netlify de Nico.

Entorno: Node portátil en `~/.peak-tools/node` (no está en el PATH del sistema); la app
corre con Vite en el puerto 5173.

## Convenciones
- Git desde el inicio; commit al cerrar cada fase.
- El acceso de Profe nunca debe exponer datos de pagos ni información confidencial de
  alumnos (aplicar tanto en UI como en las políticas RLS de Supabase).
