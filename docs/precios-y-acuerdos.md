# Precios y acuerdos — Peak Performance

> Los precios se actualizan **trimestralmente**. Valores vigentes: **trimestre Junio–Julio–Agosto 2026**.
> Los planes mensuales se abonan **del 1 al 6 de cada mes**.

## Planes normales (grupales)

| Plan     | Detalle                                                   | Precio        |
|----------|-----------------------------------------------------------|---------------|
| Básico   | Hasta 3 veces por semana                                  | $75.000 / mes |
| Full     | Pase libre                                                | $82.000 / mes |
| Semanal  | 1 vez por semana                                          | $35.000 / mes |
| Online   | Incluye 1 vez/semana presencial en PEAK (resto por BuilderPro) | $60.000 / mes |
| Por día  | Pase por día / visita suelta (NO mensual)                 | $18.000 / día |

Estos valores coinciden con los datos iniciales cargados en la Fase 0.

## Add-on: medición nutricional (acuerdo con Diego Sívori Nutrición)

- Algunos alumnos pagan **+$20.000 / mes** por una **medición antropométrica** (NO incluye consulta).
- Peak le paga **$20.000 a Diego Sívori por cada alumno medido** (pass-through, sin margen para Peak).
- Nutricionista a cargo: **Carla**.
- Promo Jun–Jul–Ago 2026: los planes **Básico** y **Full** lo incluyen por ese +$20.000 →
  Básico $95.000, Full $102.000. No acumulable con otras promos.

## Planes personalizados (personal / grupo reducido) — precio POR PERSONA

| Grupo         | Frecuencia | Precio c/u     |
|---------------|------------|----------------|
| 1 persona     | 1x semana  | $90.000 / mes  |
| 1 persona     | 2x semana  | $105.000 / mes |
| 1 persona     | 3x semana  | $120.000 / mes |
| 2–3 personas  | 1x semana  | $70.000 / mes  |
| 2–3 personas  | 2x semana  | $85.000 / mes  |
| 2–3 personas  | 3x semana  | $97.000 / mes  |

> Todavía NO están cargados en el catálogo de `planes` de Supabase. Se agregan en la Fase 1.

## Reemplazos entre profes (cobertura de turnos)

Lo que un profe le paga a otro cuando no puede cubrir su turno y otro se lo cubre:

| Cobertura          | Precio c/u |
|--------------------|------------|
| 1 turno            | $6.500     |
| 2 turnos seguidos  | $5.000     |
| 3 turnos seguidos  | $4.500     |

> Se usa en la **Fase 2** (roster de profes, vacaciones y la compensación de "exceso").

## Notas de diseño

- Como los precios cambian cada trimestre, la app debe permitir **editarlos fácil**. Los pagos ya
  registrados conservan su **monto histórico** (no se recalculan cuando cambia el precio del plan).
- Ventana de vencimiento por defecto: **día 6** del mes (se abona del 1 al 6).
