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
import { haceCuanto } from './Lesiones'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function Inicio({ onIrAlumno, onIr }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    ;(async () => {
      const now = new Date()
      const hoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const [{ data: alumnos }, { data: pagos }, { data: asistencias }, { data: lesiones }, { data: feriado }, { data: profes }] = await Promise.all([
        supabase
          .from('alumnos')
          .select('id, nombre, estado, medicion_nutricional, paga_directo_profe, fecha_nacimiento, fecha_alta, fecha_baja, ajuste_monto, planes(precio_mensual)'),
        supabase.from('pagos').select('alumno_id, monto, fecha_pago'),
        supabase.from('asistencias').select('alumno_id, fecha, presente'),
        supabase.from('lesiones').select('alumno_id, tipo, desde').is('hasta', null),
        supabase.from('eventos').select('titulo, fecha, profe_id').eq('tipo', 'feriado').gte('fecha', hoy).order('fecha').limit(1).maybeSingle(),
        supabase.from('profes_publico').select('id, nombre'),
      ])
      setData({ alumnos: alumnos || [], pagos: pagos || [], asistencias: asistencias || [], lesiones: lesiones || [], feriado: feriado || null, profes: profes || [] })
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

  // Ingresos vs promedio de los meses anteriores (con datos)
  const mesKey = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
  const totMes = {}
  data.pagos.forEach((p) => {
    if (!p.fecha_pago) return
    const k = p.fecha_pago.slice(0, 7)
    totMes[k] = (totMes[k] || 0) + Number(p.monto || 0)
  })
  const prevVals = Object.entries(totMes).filter(([k, v]) => k < mesKey && v > 0).map(([, v]) => v)
  const promIngresos = prevVals.length ? prevVals.reduce((a, b) => a + b, 0) / prevVals.length : 0
  const deltaIngresos = promIngresos > 0 ? Math.round(((ingresosMes - promIngresos) / promIngresos) * 100) : null

  const venc6 = vencimientoPorDefecto()
  const estadoDeuda = estadoPago({ vencimiento: venc6, fecha_pago: null })
  const deudores = activosPeak
    .filter((a) => !pagadoSet.has(a.id))
    .map((a) => ({ id: a.id, nombre: a.nombre, monto: precioMensual(a) }))
    .sort((x, y) => x.nombre.localeCompare(y.nombre))
  const pendienteTotal = deudores.reduce((s, d) => s + d.monto, 0)
  const proximos = deudores.slice(0, 6)

  // Alumnos en riesgo (retención): dejaron de venir. Cruza asistencia + deuda.
  // Se enciende cuando se toma lista; hoy queda vacío si no hay asistencias.
  const DIAS_RIESGO = 14
  const hoyMs = Date.now()
  const ultimaPresente = new Map() // alumnoId -> 'YYYY-MM-DD' más reciente con presente
  const trackeados = new Set() // alumnos a los que alguna vez se les tomó lista
  ;(data.asistencias || []).forEach((a) => {
    trackeados.add(a.alumno_id)
    if (a.presente && (!ultimaPresente.has(a.alumno_id) || a.fecha > ultimaPresente.get(a.alumno_id))) {
      ultimaPresente.set(a.alumno_id, a.fecha)
    }
  })
  const diasDesde = (iso) => Math.floor((hoyMs - new Date(iso + 'T00:00:00').getTime()) / 86400000)
  const deudorSet = new Set(deudores.map((d) => d.id))
  const enRiesgo = activos
    .filter((a) => trackeados.has(a.id))
    .map((a) => {
      const ult = ultimaPresente.get(a.id)
      const dias = ult ? diasDesde(ult) : Infinity
      return { id: a.id, nombre: a.nombre, dias, ult, debe: deudorSet.has(a.id) }
    })
    .filter((r) => r.dias >= DIAS_RIESGO)
    .sort((x, y) => (y.dias === Infinity ? 1e9 : y.dias) - (x.dias === Infinity ? 1e9 : x.dias))
  const riesgoTop = enRiesgo.slice(0, 6)

  // Alumnos lesionados (lesión activa), del más antiguo al más nuevo
  const nombrePorId = new Map(data.alumnos.map((a) => [a.id, a.nombre]))
  const lesionados = (data.lesiones || [])
    .map((l) => ({ id: l.alumno_id, nombre: nombrePorId.get(l.alumno_id) || '—', tipo: l.tipo, desde: l.desde }))
    .sort((a, b) => (a.desde < b.desde ? -1 : 1))
  const lesionadosTop = lesionados.slice(0, 8)

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

  // Próximo feriado y a quién le toca (se carga/edita en Agenda, solo admin)
  const feriado = data.feriado
  const profeNombre = (id) => data.profes.find((p) => p.id === id)?.nombre
  const fmtFeriado = (f) => { const [, m, d] = f.split('-').map(Number); return `${d} de ${MESES[m - 1]}` }
  const hoyISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
  const diasFeriado = feriado ? Math.round((new Date(feriado.fecha + 'T00:00:00') - new Date(hoyISO + 'T00:00:00')) / 86400000) : null
  const sufFeriado = diasFeriado == null ? '' : diasFeriado <= 0 ? ' · hoy' : diasFeriado === 1 ? ' · mañana' : ` · en ${diasFeriado} días`

  return (
    <div>
      <div className="section-head">
        <h1 className="section-title">Inicio</h1>
      </div>
      <p className="cal-sub">Resumen rápido de cómo viene todo</p>

      <div className="stat-grid">
        <Stat label="Alumnos activos" value={activosPeak.length} onClick={() => onIr && onIr('alumnos')} />
        <Stat
          label="Deben este mes"
          value={formatARS(pendienteTotal)}
          sub={`${deudores.length} alumno${deudores.length === 1 ? '' : 's'}`}
          accent="#f2cd5c"
          onClick={() => onIr && onIr('pagos')}
        />
        <Stat
          label="Ingresos del mes"
          value={formatARS(ingresosMes)}
          sub={deltaIngresos != null
            ? <span style={{ color: deltaIngresos >= 0 ? '#86d98f' : '#f0999a' }}>
                {deltaIngresos >= 0 ? '▲' : '▼'} {Math.abs(deltaIngresos)}% vs promedio
              </span>
            : null}
          onClick={() => onIr && onIr('pagos')}
        />
        <Stat
          label="Medición (Diego)"
          value={conMedicion}
          sub={`${formatARS(conMedicion * MEDICION_MONTO)} a Diego`}
        />
      </div>

      <div className="pk-card" style={{ marginTop: 14 }}>
        <div className="card-title">📅 Próximo feriado</div>
        {feriado ? (
          <button className="mini-row mini-row-btn" onClick={() => onIr && onIr('agenda')}>
            <span><b>{feriado.titulo}</b> <span className="muted">· {fmtFeriado(feriado.fecha)}{sufFeriado}</span></span>
            <span className={feriado.profe_id ? '' : 'txt-venc'}>
              {feriado.profe_id ? `le toca a ${profeNombre(feriado.profe_id) || '—'}` : 'sin asignar'}
            </span>
          </button>
        ) : (
          <p className="muted" style={{ margin: 0 }}>No hay feriados próximos cargados. Cargalos en Agenda.</p>
        )}
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
        <div className="card-title">⚠️ Alumnos en riesgo</div>
        {riesgoTop.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {trackeados.size === 0
              ? 'Se enciende cuando empieces a tomar lista: te marca a los que dejaron de venir.'
              : '¡Nadie dejó de venir! 👌'}
          </p>
        ) : (
          <>
            {riesgoTop.map((r) => (
              <button
                key={r.id}
                className="mini-row mini-row-btn"
                onClick={() => onIrAlumno && onIrAlumno(r.id)}
              >
                <span>{r.nombre}</span>
                <span className="txt-venc">
                  {r.ult ? `hace ${r.dias} días` : 'no vino aún'}{r.debe ? ' · debe' : ''}
                </span>
              </button>
            ))}
            {enRiesgo.length > riesgoTop.length && (
              <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
                y {enRiesgo.length - riesgoTop.length} más…
              </p>
            )}
          </>
        )}
      </div>

      <div className="pk-card" style={{ marginTop: 14 }}>
        <div className="card-title">🩹 Alumnos lesionados</div>
        {lesionadosTop.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Nadie lesionado ahora 💪</p>
        ) : (
          <>
            {lesionadosTop.map((l, i) => (
              <button
                key={`${l.id}-${i}`}
                className="mini-row mini-row-btn"
                onClick={() => onIrAlumno && onIrAlumno(l.id)}
              >
                <span>{l.nombre} <span className="muted">· {l.tipo}</span></span>
                <span className="txt-venc">{haceCuanto(l.desde)}</span>
              </button>
            ))}
            {lesionados.length > lesionadosTop.length && (
              <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
                y {lesionados.length - lesionadosTop.length} más…
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

function Stat({ label, value, sub, accent, onClick }) {
  const inner = (
    <>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : null}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </>
  )
  if (onClick) {
    return <button className="stat-card stat-card-btn" onClick={onClick}>{inner}</button>
  }
  return <div className="stat-card">{inner}</div>
}
