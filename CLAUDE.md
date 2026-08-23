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

## Estado del proyecto (al 2026-08-07)
**Las 7 solapas están hechas y funcionando.** Migraciones aplicadas en Supabase: 0001–0017
(0013 = asistencia; 0014 = `fecha_alta`/`fecha_baja` de alumnos, 2026-08-07; 0015 = `objetivos`/`foto_path`, 2026-08-08;
0016 = `alumnos.email`, 2026-08-09; 0017 = tabla `lesiones` (historial), 2026-08-09;
0018 = self-service de profes (RLS: el profe escribe SUS vacaciones y SUS personalizados), 2026-08-09).
**Profes self-service (Fase A, 2026-08-09):** el profe carga **sus vacaciones** (en Mi Peak), tiene pestaña **"Mi acuerdo"**
(ve solo el suyo, read-only) y pestaña **"Personalizados"** (nombre+días+horario → crea sesiones tipo personalizado que
aparecen en el Calendario). Permisos acotados por `mi_profe_id()`: el profe solo toca lo suyo.
**Fase B — calendario interactivo (2026-08-10, HECHO):** en Calendario, toggle **Bloques/🗓 Grilla**. La Grilla (`GrillaSemanal.jsx`)
es una vista día-por-día estilo Google Calendar: línea de tiempo a escala, sesiones posicionadas por hora (carriles para las que
se solapan), color por profe; admin toca un hueco→crea (día/hora precargados) o un bloque→edita; profes la ven read-only. Nuevo
tipo **`bloqueo`** (migración **0019**) para marcar turnos no disponibles. Fix en `SesionForm`: `editing = !!sesion?.id`.
**Fase C — Planificaciones más pro (2026-08-10, HECHO):** editor `PlanDia.jsx` rediseñado — cada ejercicio en tarjeta legible
(nombre + Series×Reps) con reordenar/duplicar/borrar; **autocompletado** de ejercicios (datalist con la biblioteca de todos los
usados); bloques con **nombre editable** + reordenar/quitar; **"Copiar de…"** trae otro día. En la lista, **"Copiar mes"** duplica
toda la planificación de un mes a otro. Sin migración (mismo modelo `ec`/`bloques`). **Las 3 fases (A/B/C) que pidió Nico están hechas.**
**Extras (2026-08-10, HECHOS — migración 0020):** (1) **Plantillas de bloque** en `PlanDia.jsx`: cada bloque tiene 💾 "Guardar como
plantilla" (nombre+ejercicios → tabla `plantillas_bloque`, la usan todos los profes); botón "📁 Desde plantilla" lista las guardadas
e inserta una como bloque nuevo; se borran desde el panel. (2) **Horario del gimnasio** en la Grilla (`GrillaSemanal.jsx`): la línea de
tiempo arranca/termina en el horario activo (default 7:00–22:00, se estira si hay una sesión fuera para no cortarla); admin lo edita
con "✏️ Editar horario" (se guarda en `config` clave `horario_gimnasio`); los profes lo ven read-only. CRUD de ambas verificado en vivo.
**Agenda mensual privada (2026-08-10, HECHA — migración 0021):** pestaña **admin-only** `AgendaMes.jsx` (bloque "Solo admins" del
Sidebar + `ADMIN_SECC` + RLS `es_admin()` → los profes no la ven ni por pantalla ni por base). Grilla del mes estilo calendario
(lunes primero), puntitos de color por tipo en cada día, navegación ← →, "Ir a hoy". Tocás un día → panel con sus eventos (editar/borrar)
y "+ Agregar acá". Tabla **`eventos`** (id, titulo, tipo, fecha, fecha_fin, profe_id, nota): tipos **feriado/campamento/vacaciones/
partido/evento/otro** con color; `profe_id` = "a quién le toca" (feriados rotativos, campamento de Eze, partido de alguien, etc.);
soporta rango multi-día (puntito en cada día). CRUD verificado en vivo. Botón **"🇦🇷 Feriados 2026"** carga los 16 feriados nacionales
de una (tipo feriado, sin profe → Nico asigna después; anti-duplicados por fecha). Los 16 quedaron cargados en `eventos` el 2026-08-10.
En **Inicio** (admin) una tarjeta **"📅 Próximo feriado"** muestra el feriado más cercano (fecha + "en N días") y **a quién le toca**
(o "sin asignar" en rojo); clickeable → lleva a la Agenda para asignarlo. Sale del mismo `eventos` (admin-only), así que los profes no lo ven.
**⚠️ Deploy 2026-08-10:** Netlify pausó los deploys (créditos del ciclo agotados, se destraba ~4/sept). Puente en **GitHub Pages**
(`nicolasm9.github.io/app-peak`, repo temporalmente público) — ver [[auto-deploy]] en memoria. Migraciones aplicadas: **0001–0024**
(0019 = tipo `bloqueo`; 0020 = tabla `plantillas_bloque` + lectura de `config` horario_gimnasio para staff; 0021 = tabla `eventos`
para la Agenda admin; 0022 = tabla `dif_semanal` para el registro semanal Nico↔Eze; 0023 = tablas `contenidos` + `redes_metricas`
para la pestaña Redes; 0024 = `contenidos.fecha` opcional (backlog) + `contenidos.pasos` jsonb (checklist) + `redes_metricas.meta`;
0025 = `alumnos.franja` (am/pm/ambas), aplicadas 2026-08-11; 0026 = vacaciones admin-only, 2026-08-23). **0027 = pestaña NM (pendiente de aplicar).**
Pendiente operativo: cuando Netlify se destrabe (~4/sept) → repo a **privado**.
**Vacaciones privadas (2026-08-23, migración 0026):** las vacaciones ahora las ven/gestionan **solo los admins** (Nico/Eze). Se sacó la
sección Vacaciones de **Horas** para el profe (`{esAdmin && (...)}`) y se quitó **"Mis vacaciones"** de **Mi Peak** (`MisVacaciones.jsx` queda
sin usar). RLS: `vacaciones_select` pasó a solo `es_admin()` y se dropeó `vacaciones_profe_write` (revierte el self-service de vacaciones de Fase A).
**Pestaña NM — privada de Nico (2026-08-23, migración 0027, EN CURSO):** espacio personal **solo de Nico** (ni Eze ni profes; ni en pantalla ni en base),
**totalmente aparte de Peak** (tablas nuevas `nm_*`, no tocan alumnos/pagos/facturación). Gate: helper **`es_nico()`** (admin cuyo `profes.nombre` empieza
con "Nico" — el nombre real es exactamente `Nico`, como en la cuenta Nico↔Eze) + gate cliente `esNico` en AppShell/Sidebar (bloque "Solo Nico", `NICO_SECC`).
Migración 0027 crea: `nm_alumnos`, `nm_pagos`, `nm_progreso`, `nm_objetivos`, `nm_archivos` (+bucket Storage `nm-archivos`), `nm_ingresos`, `nm_contenido`,
`nm_datos` (todas RLS `es_nico()`). **Landing** `NM.jsx` = grilla de cuadrados (tocás → sub-vista): Calendario de contenido / Alumnos online / Hacoaj-sueldo /
Archivos. **Entrega 1 (hecha):** landing + **Calendario de contenido** (`NMContenido.jsx`) estilo **Google Calendar / tablero** semana a semana (← →):
7 columnas por día (scroll horizontal en mobile, Trello-like), cada contenido es una **tarjeta arrastrable** (drag por el ⠿ vía Pointer Events + `setPointerCapture`
+ `elementFromPoint`, un código para mouse y touch; borde `over` en la columna destino; autoscroll en los bordes), **varios eventos por día**, "+" por columna
para sumar y tap → **modal** editor (título/nota/estado idea·listo·subido/**selector de Día** para mover sin arrastrar/borrar). Estructura fija editable por día
(`nm_datos` clave `plantilla_contenido`: Lun=vitamina técnica, Mar=historias Hacoaj, Mié=video Santi+historias Peak, Jue=rotativo análisis/lesiones/online,
Vie=vitamina útil pre partido, Sáb/Dom=dump semanal) se muestra como tema de cada columna; eventos en `nm_contenido` (múltiples filas por fecha; drag = update `fecha`). **Pendiente (próximas entregas):**
Alumnos online (CRM: pagos + progreso con gráficos + objetivos + informes mensual/trim/anual + comparativas), Hacoaj/sueldo (`nm_ingresos`), Archivos (upload a `nm-archivos`).
**Franja horaria del alumno (2026-08-11, migración 0025):** selector **AM / PM / Ambas** en la **lista** de Alumnos (al lado de "Baja",
`setFranjaRow` con stopPropagation, en mobile cae a 2da línea vía `@media (max-width:600px)`) y también en la **ficha** (`AlumnoDetalle.jsx`)
(guarda al toque en `alumnos.franja`; tocar la activa la limpia). En **Estadísticas** el gráfico "Franja (AM / PM)" ahora cuenta por
`alumnos.franja` (Vienen AM = am|ambas, Vienen PM = pm|ambas, AM y PM = ambas, Sin definir), con drill a los alumnos. **OJO patrón:**
agregar una columna nueva al `.select()` rompe la query hasta correr la migración → en estos casos el SQL va **antes** del deploy.
**Agenda — mejoras (2026-08-11):** cuadrantes al doble de alto (`min-height: max(80px,13.5vh)`); cada día muestra el **texto** del
evento en chips de color (no solo puntito); **filtro por tipo** (chips arriba); y las **vacaciones de Horas** se traen como eventos
read-only (`vacEventos` desde tabla `vacaciones`, no se editan en la Agenda). Sin migración.
**Redes [admin] (`Redes.jsx`, 2026-08-11):** pestaña privada (bloque "Solo admins") = **calendario de contenido** (reusa la grilla de
la Agenda): cada día carga ideas/contenido con **tipo** (historia/publicación/ambas) y **checklist** de 4 pasos (grabar→editar→copy→subir,
`contenidos.pasos` jsonb, se tildan inline desde el día; el puntito se prende cuando `subir`=true). **Backlog** "Ideas sueltas"
(`fecha` null) con input para programarlas al calendario. **KPIs del mes**: subidos / historias / publicaciones / **consultas p/ entrenar**
(manual, `redes_metricas.consultas`, editable) / **altas del mes** (de `alumnos.fecha_alta`) / **conversión** (altas÷consultas). **Meta**
mensual (`redes_metricas.meta`) con barra de progreso + "hace N días que no subís". Todo verificado (data-layer por REST). Pendiente idea
futura descartada por Nico: seguidores nuevos por mes.
**UI (2026-08-11):** interlineado título→subtítulo unificado en toda la app — `.cal-sub` pasó de margen negativo a `margin: 4px 0 16px`
+ `.section-head:has(+ .cal-sub) { margin-bottom: 0 }` (el gap queda parejo en ~4px esté el título suelto o dentro del section-head);
Inicio dejó de usar `.muted` con margen inline y usa `.cal-sub`.
**Lesiones (2026-08-09):** historial por alumno en tabla `lesiones` (admin-only). En la ficha se agregan/marcan "recuperada"
(sincroniza `estado_fisico`); Inicio muestra "Alumnos lesionados" (quién/tipo/hace cuánto) y Estadísticas cuenta
activas/recuperadas + duración promedio + por tipo. **Profes: sin plata** — Mi Peak ya no muestra el acuerdo/sueldo del profe. **Datos de contacto cargados (2026-08-09):** 77/82 alumnos con **teléfono** y
**email** (importados del CSV de Turnos Web `Peak Performance.csv`; ese archivo NO trae fecha de nacimiento →
sigue pendiente). El WhatsApp a deudores quedó operativo. **App publicada** en `earnest-moonbeam-59f0d7.netlify.app`
con **auto-deploy activo** (2026-08-07): repo privado `github.com/NicolasM9/app-peak` enlazado a Netlify;
cada `git push` a `main` buildea (`npm run build`→`dist`, Node 22 vía `netlify.toml`) y publica solo.
Las claves de Supabase van como variables de entorno en Netlify (`VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY`), porque el código las toma de `import.meta.env` y `.env` está gitignoreado.

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
  permiso por sesión. **Carga rápida** (`CargaSesiones.jsx`): crea muchas sesiones de la semana tipo
  de una (título/tipo/profe + horarios AM/PM/sueltos + días → días×horarios, saltea las que ya existen).
- **Horas:** grilla de rotaciones semanal + total por profe + vacaciones (tablas `turnos`/`vacaciones`).
- **Acuerdos profes [admin]:** lo que cobra cada profe (base + personalizados 100%/60%); dueños excluidos.
- **Planificaciones:** rutinas por mes/semana/día (148 sesiones importadas del Excel 2026),
  Modo TV para la pantalla, ranking de ejercicios más usados.

**Logins del staff:** los **5 creados y conectados** — Nico y Eze (admin), Gastón, Ailén y Octavio
(profe). Se crean en Supabase → Authentication → Users (con "Auto Confirm") y se enlazan a la ficha
de `profes` por `user_id` (match por mail). Octavio linkeado el 2026-08-07 (profe id 2).

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
  todo junto) y tarjeta **Diferencia de horas Nico↔Eze** (solo admin). **(2026-08-11, migración 0022)** pasó a un
  **registro semana a semana** (tabla `dif_semanal`, admin-only): cada fila = una semana con su diferencia en
  turnos (signo: + Eze / − Nico). El **acumulado = suma de todas las filas**; botón **"Registrar esta semana"**
  toma la diferencia de la grilla (Eze−Nico turnos) y la inserta (una por semana, keyed por lunes → re-registrar
  actualiza), **"+ ajuste manual"** (Eze/Nico + turnos + nota) para corregir el arrastre o sumar sueltos, y ✕ por
  fila. Sirve para emparejar con vacaciones. Semilla: la primera fila migró el valor viejo de `config.dif_nico_eze`.
  (Antes era arrastre+semana en `config`, quedaba trabado con la grilla de la semana.)
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

**Mejoras (2026-08-07):**
- **Auto-deploy** GitHub→Netlify (ver arriba) y **Calendario cargado**: 26 sesiones Peak de la semana
  (vacaciones de Eze) con **carga rápida** (`CargaSesiones.jsx`, botón en el Calendario).
- **Alta/baja de alumno** con un toque desde la lista (botón Baja/Alta con confirm, actualiza en el lugar).
- **Pagos:** los gastos se actualizan sin refrescar la pantalla.
- **Planificaciones** rediseñada (semanas en paneles con acento cobalto, tarjetas grandes 2/fila en mobile,
  días con plan marcados con badge).
- **Inicio:** tarjeta "Altas y bajas del mes" vs mes anterior (migración 0014; la baja setea `fecha_baja`,
  el alta nueva `fecha_alta`).
- **Horas ↔ Calendario** sincronizados (`src/lib/syncTurnos.js`): asignar/cambiar el profe de un turno Peak
  en cualquiera de las dos pestañas actualiza la otra (un profe por turno). Horarios PM emparejados a
  18:00/19:30. La cuenta Nico↔Eze no se toca.

**Mejoras (2026-08-07, tanda 3):**
- **Calendario rediseñado** (`Calendario.jsx`): cada día muestra un bloque **PEAK AM** y **PEAK PM** con el
  profe grande, centrado y con su **color de Horas**. Tocar un bloque abre las clases de esa franja para editar.
- **Pestaña Estadísticas [admin]** (`Estadisticas.jsx`): gráficos SVG de edades, deportes, franja AM/PM,
  días/semana y antigüedad, con **drill-down** (tocar una barra → alumnos → ficha). Se llena con los datos
  que se carguen (hoy casi vacía: 1/77 con fecha de nacimiento, 0 roster).
- **"Crear informe" del alumno** (`Informe.jsx`): PDF limpio y profesional (`window.print`, `@media print`)
  con objetivos + progreso de mediciones/testeos, para mandar por WhatsApp. Se completa con los datos cargados.

**Mejoras (2026-08-07, tanda 4):**
- **Respaldo Excel** (`src/lib/exportar.js`): botón "⬇ Respaldo Excel" en Pagos (admin) que baja un `.xlsx`
  con hojas Alumnos/Pagos/Gastos. Usa **SheetJS (`xlsx`)** con import dinámico (chunk aparte).
- **Mi Peak** (profe) mejorado: tarjeta **"Hoy"** con las clases del día, "Mis días" resalta hoy, y card de
  próximas vacaciones.
- Pulido: se sacó el import muerto `Placeholder` y se ajustó el padding del informe en mobile.
- **Objetivos guardados** (migración 0015): campo en la ficha (AlumnoForm), se ven en el detalle y
  pre-cargan el Informe (interconecta Alumnos↔Informe).

**Mejoras (2026-08-08, tanda 5 — "todo lo otro sin foto"):** 5 pantallas listas-para-datos, todas
interconectadas y verificadas en vivo:
- **Carga masiva de fechas de nacimiento + deportes** (`CargaDatos.jsx`): botón "📋 Cargar datos" en
  Alumnos; selector de campo, parser de fechas multi-formato, datalist de deportes, reusa `match.js`.
  Enciende Estadísticas (edades/deportes) y los cumpleaños de Inicio.
- **Historial de facturación** (`HistorialFacturacion.jsx`): botón "📈 Historial" en Pagos; barras de
  cobrado por mes + total/promedio/mejor mes. Se llena solo con los pagos que se registran.
- **Alumnos en riesgo** (tarjeta en `Inicio.jsx`): cruza asistencia (≥14 días sin venir) + deuda,
  clickeable → ficha. Se enciende al tomar lista.
- **Aviso masivo a deudores** (`AvisoDeudores.jsx`): botón "📣 Avisar a deudores" en los Cobros de
  Pagos; plantilla editable ({nombre}/{monto}/{mes}), un WhatsApp por deudor que se marca como enviado,
  y lista aparte de los que no tienen teléfono. Cruza deudores + teléfonos.
- **Ocupación por turno** (sección en `Estadisticas.jsx`): cuenta el roster de cada sesión Peak,
  ordenada por día/hora, con color y nombre del profe (de Horas/Calendario), drill → fichas.

**Pendientes:** cargar datos de los alumnos para que se llenen Estadísticas / Evolución / Informe /
tomar lista / ocupación / WhatsApp: **fechas de nacimiento** y **deportes** (📋 Cargar datos → Estadísticas),
**teléfonos** (☎ Teléfonos → WhatsApp y aviso a deudores), **mediciones/testeos** (Evolución e Informe) y
el **roster** de cada sesión (Calendario → franja → alumnos → ocupación, AM/PM, días/semana y tomar lista).
El historial de facturación se llena solo mes a mes. (Login de Octavio: hecho el 2026-08-07 — los 5 del staff ya están.)
**Auto-deploy YA montado** (GitHub + Netlify): ya no se arrastra `dist/`; alcanza con `git push`.

Entorno: Node portátil en `~/.peak-tools/node` (no está en el PATH del sistema); la app
corre con Vite en el puerto 5173.

## Convenciones
- Git desde el inicio; commit al cerrar cada fase.
- El acceso de Profe nunca debe exponer datos de pagos ni información confidencial de
  alumnos (aplicar tanto en UI como en las políticas RLS de Supabase).
