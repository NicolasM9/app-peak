import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import {
  precioMensual,
  estadoPago,
  vencimientoPorDefecto,
  MEDICION_MONTO,
  ESTADO_INFO,
} from '../lib/domain'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function Inicio({ onIrAlumno }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [{ data: alumnos }, { data: pagos }] = await Promise.all([
        supabase
          .from('alumnos')
          .select('id, nombre, estado, medicion_nutricional, paga_directo_profe, fecha_nacimiento, fecha_alta, fecha_baja, ajuste_monto, planes(precio_mensual)'),
        supabase.from('pagos').select('alumno_id, monto, fecha_pago'),
      ])
      setData({ alumnos: alumnos || [], pagos: pagos || [] })
    })()
  }, [])

  if (!data) return <p className="muted">Cargando…</p>

  const ahora = new Date()
  const esteMes = (iso) => {
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth()
  }

  const activos = data.alumnos.filter((a) => a.estado === 'activo')
  const activosPeak = activos.filter((a) => !a.paga_directo_profe)
  const conMedicion = activosPeak.filter((a) => a.medicion_nutricional).length

  const pagadoSet = new Set(data.pagos.filter((p) => esteMes(p.fecha_pago)).map((p) => p.alumno_id))
  const ingresosMes = data.pagos
    .filter((p) => esteMes(p.fecha_pago))
    .reduce((s, p) => s + Number(p.monto || 0), 0)

  const venc6 = vencimientoPorDefecto()
  const estadoDeuda = estadoPago({ vencimiento: venc6, fecha_pago: null })
  const deudores = activosPeak
    .filter((a) => !pagadoSet.has(a.id))
    .map((a) => ({ id: a.id, nombre: a.nombre, monto: precioMensual(a) }))
    .sort((x, y) => x.nombre.localeCompare(y.nombre))
  const pendienteTotal = deudores.reduce((s, d) => s + d.monto, 0)
  const proximos = deudores.slice(0, 6)

  // Altas y bajas del mes (vs mes anterior)
  const enMes = (iso, y, m) => {
    if (!iso) return false
    const d = new Date(iso + 'T00:00:00')
    return d.getFullYear() === y && d.getMonth() === m
  }
  const yA = ahora.getFullYear()
  const mA = ahora.getMonth()
  const prevMes = new Date(yA, mA - 1, 1)
  const yP = prevMes.getFullYear()
  const mP = prevMes.getMonth()
  const altasMes = data.alumnos.filter((a) => enMes(a.fecha_alta, yA, mA)).length
  const bajasMes = data.alumnos.filter((a) => enMes(a.fecha_baja, yA, mA)).length
  const altasAnt = data.alumnos.filter((a) => enMes(a.fecha_alta, yP, mP)).length
  const bajasAnt = data.alumnos.filter((a) => enMes(a.fecha_baja, yP, mP)).length
  const neto = altasMes - bajasMes

  const cumples = activos
    .filter((a) => a.fecha_nacimiento && Number(a.fecha_nacimiento.split('-')[1]) === ahora.getMonth() + 1)
    .map((a) => ({ id: a.id, nombre: a.nombre, dia: Number(a.fecha_nacimiento.split('-')[2]) }))
    .sort((x, y) => x.dia - y.dia)

  return (
    <div>
      <div className="section-head">
        <h1 className="section-title">Inicio</h1>
      </div>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Resumen rápido de cómo viene todo
      </p>

      <div className="stat-grid">
        <Stat label="Alumnos activos" value={activosPeak.length} />
        <Stat
          label="Deben este mes"
          value={formatARS(pendienteTotal)}
          sub={`${deudores.length} alumno${deudores.length === 1 ? '' : 's'}`}
          accent="#f2cd5c"
        />
        <Stat label="Ingresos del mes" value={formatARS(ingresosMes)} />
        <Stat
          label="Medición (Diego)"
          value={conMedicion}
          sub={`${formatARS(conMedicion * MEDICION_MONTO)} a Diego`}
        />
      </div>

      <div className="pk-card" style={{ marginTop: 14 }}>
        <div className="card-title">Deudores del mes</div>
        {proximos.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>¡Todos al día! 🎉</p>
        ) : (
          <>
            {proximos.map((d) => (
              <button
                key={d.id}
                className="mini-row mini-row-btn"
                onClick={() => onIrAlumno && onIrAlumno(d.id)}
              >
                <span>{d.nombre}</span>
                <span className={estadoDeuda === 'vencido' ? 'txt-venc' : 'muted'}>
                  {ESTADO_INFO[estadoDeuda].label} · {formatARS(d.monto)}
                </span>
              </button>
            ))}
            {deudores.length > proximos.length && (
              <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
                y {deudores.length - proximos.length} más… (ver todos en Pagos)
              </p>
            )}
          </>
        )}
      </div>

      <div className="pk-card" style={{ marginTop: 14 }}>
        <div className="card-title">Altas y bajas de {MESES[ahora.getMonth()]}</div>
        <div className="ab-grid">
          <div className="ab-item">
            <span className="ab-num up">+{altasMes}</span>
            <span className="ab-lbl">altas</span>
            <span className="ab-prev">mes pasado: {altasAnt}</span>
          </div>
          <div className="ab-item">
            <span className="ab-num down">−{bajasMes}</span>
            <span className="ab-lbl">bajas</span>
            <span className="ab-prev">mes pasado: {bajasAnt}</span>
          </div>
          <div className="ab-item">
            <span className="ab-num">{neto >= 0 ? '+' : '−'}{Math.abs(neto)}</span>
            <span className="ab-lbl">neto</span>
          </div>
        </div>
      </div>

      {cumples.length > 0 && (
        <div className="pk-card" style={{ marginTop: 14 }}>
          <div className="card-title">🎂 Cumpleaños de {MESES[ahora.getMonth()]}</div>
          {cumples.map((c) => (
            <button
              key={c.id}
              className="mini-row mini-row-btn"
              onClick={() => onIrAlumno && onIrAlumno(c.id)}
            >
              <span>{c.nombre}</span>
              <span className="muted">{c.dia} de {MESES[ahora.getMonth()].toLowerCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : null}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
