import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const COLORS = ['#2f6fb0', '#1f8f78', '#6d4bd0', '#b9791a', '#b3557a', '#3a7d44', '#c15b3f']
const DIA_ORDEN = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 7 }
const DIA_LABEL = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }

function toMin(t) {
  const [h, m] = (t || '00:00').split(':')
  return Number(h) * 60 + Number(m)
}
function fmtHora(t) {
  return (t || '').slice(0, 5).replace(/^0/, '')
}
function edadDe(fnac) {
  if (!fnac) return null
  const d = new Date(fnac + 'T00:00:00')
  const h = new Date()
  let e = h.getFullYear() - d.getFullYear()
  const m = h.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && h.getDate() < d.getDate())) e--
  return e
}
function mesesDe(f) {
  if (!f) return null
  const d = new Date(f + 'T00:00:00')
  const h = new Date()
  return (h.getFullYear() - d.getFullYear()) * 12 + (h.getMonth() - d.getMonth())
}

export default function Estadisticas({ onIrAlumno }) {
  const [data, setData] = useState(null)
  const [drill, setDrill] = useState(null) // { titulo, items:[{id,nombre}] }

  useEffect(() => {
    ;(async () => {
      const [{ data: al }, { data: ra }, { data: se }, { data: pr }] = await Promise.all([
        supabase.from('alumnos').select('id, nombre, deporte, fecha_nacimiento, fecha_alta, medicion_nutricional').eq('estado', 'activo').order('nombre'),
        supabase.from('sesion_alumnos').select('alumno_id, sesion_id'),
        supabase.from('sesiones').select('id, dia, hora_inicio, tipo, profe_id'),
        supabase.from('profes_publico').select('id, nombre').order('id'),
      ])
      setData({ alumnos: al || [], roster: ra || [], sesiones: se || [], profes: pr || [] })
    })()
  }, [])

  const stats = useMemo(() => {
    if (!data) return null
    const { alumnos, roster, sesiones, profes } = data
    const sesById = new Map(sesiones.map((s) => [s.id, s]))
    const colorProfe = (id) => COLORS[Math.max(0, profes.findIndex((p) => p.id === id)) % COLORS.length]
    const nombreProfe = new Map(profes.map((p) => [p.id, p.nombre]))
    const porAlumno = new Map() // id -> { franjas:Set, dias:Set }
    roster.forEach((r) => {
      const s = sesById.get(r.sesion_id)
      if (!s || s.tipo !== 'peak') return
      if (!porAlumno.has(r.alumno_id)) porAlumno.set(r.alumno_id, { franjas: new Set(), dias: new Set() })
      const o = porAlumno.get(r.alumno_id)
      o.franjas.add(toMin(s.hora_inicio) < 720 ? 'AM' : 'PM')
      o.dias.add(s.dia)
    })

    const bucketize = (defs, valorDe) => {
      const res = defs.map((d) => ({ label: d.label, n: 0, ids: [] }))
      alumnos.forEach((a) => {
        const v = valorDe(a)
        if (v == null) return
        const i = defs.findIndex((d) => d.test(v))
        if (i >= 0) { res[i].n++; res[i].ids.push(a.id) }
      })
      return res
    }

    const edades = bucketize(
      [
        { label: '≤17', test: (v) => v <= 17 },
        { label: '18–25', test: (v) => v >= 18 && v <= 25 },
        { label: '26–35', test: (v) => v >= 26 && v <= 35 },
        { label: '36–45', test: (v) => v >= 36 && v <= 45 },
        { label: '46+', test: (v) => v >= 46 },
      ],
      (a) => edadDe(a.fecha_nacimiento),
    )
    const edadesCargadas = alumnos.filter((a) => a.fecha_nacimiento).length
    const edadProm = edadesCargadas
      ? Math.round(alumnos.reduce((s, a) => s + (edadDe(a.fecha_nacimiento) || 0), 0) / edadesCargadas)
      : null

    // deportes
    const depMap = new Map()
    alumnos.forEach((a) => {
      const d = (a.deporte || '').trim()
      if (!d) return
      if (!depMap.has(d)) depMap.set(d, [])
      depMap.get(d).push(a.id)
    })
    const deportes = [...depMap.entries()].map(([label, ids]) => ({ label, n: ids.length, ids })).sort((x, y) => y.n - x.n)

    // AM / PM
    const franjas = [
      { label: 'Vienen AM', test: (o) => o.franjas.has('AM') },
      { label: 'Vienen PM', test: (o) => o.franjas.has('PM') },
      { label: 'AM y PM', test: (o) => o.franjas.has('AM') && o.franjas.has('PM') },
    ].map((f) => {
      const ids = [...porAlumno.entries()].filter(([, o]) => f.test(o)).map(([id]) => id)
      return { label: f.label, n: ids.length, ids }
    })

    // antigüedad
    const antig = bucketize(
      [
        { label: '< 1 mes', test: (v) => v < 1 },
        { label: '1–3 meses', test: (v) => v >= 1 && v < 3 },
        { label: '3–6 meses', test: (v) => v >= 3 && v < 6 },
        { label: '6–12 meses', test: (v) => v >= 6 && v < 12 },
        { label: '+ 1 año', test: (v) => v >= 12 },
      ],
      (a) => mesesDe(a.fecha_alta),
    )

    // días / semana
    const diasSemana = [1, 2, 3, 4, 5, 6].map((n) => {
      const ids = [...porAlumno.entries()].filter(([, o]) => o.dias.size === n).map(([id]) => id)
      return { label: `${n} día${n === 1 ? '' : 's'}`, n: ids.length, ids }
    }).filter((d) => d.n > 0 || d.label === '1 día')

    // Ocupación por turno (cada sesión Peak con su roster)
    const rosterPorSesion = new Map()
    roster.forEach((r) => {
      if (!rosterPorSesion.has(r.sesion_id)) rosterPorSesion.set(r.sesion_id, [])
      rosterPorSesion.get(r.sesion_id).push(r.alumno_id)
    })
    const turnos = sesiones
      .filter((s) => s.tipo === 'peak')
      .map((s) => {
        const ids = rosterPorSesion.get(s.id) || []
        return {
          id: s.id,
          label: `${DIA_LABEL[s.dia] || s.dia} ${fmtHora(s.hora_inicio)}`,
          dia: s.dia,
          hora: s.hora_inicio,
          profe: nombreProfe.get(s.profe_id) || '—',
          color: colorProfe(s.profe_id),
          n: ids.length,
          ids,
        }
      })
      .sort((a, b) => (DIA_ORDEN[a.dia] || 9) - (DIA_ORDEN[b.dia] || 9) || toMin(a.hora) - toMin(b.hora))
    const ocupTotal = turnos.reduce((s, t) => s + t.n, 0)
    const turnoLleno = turnos.reduce((a, b) => (b.n > (a?.n || 0) ? b : a), null)

    return {
      total: alumnos.length,
      edadesCargadas,
      edadProm,
      conMedicion: alumnos.filter((a) => a.medicion_nutricional).length,
      nombreById: new Map(alumnos.map((a) => [a.id, a.nombre])),
      charts: { edades, deportes, franjas, antig, diasSemana },
      turnos,
      ocupTotal,
      turnoLleno,
    }
  }, [data])

  if (!data) return <p className="muted">Cargando…</p>

  function abrir(titulo, d) {
    if (!d.ids.length) return
    setDrill({ titulo: `${titulo}: ${d.label}`, items: d.ids.map((id) => ({ id, nombre: stats.nombreById.get(id) || `#${id}` })).sort((a, b) => a.nombre.localeCompare(b.nombre)) })
  }

  return (
    <div className="estad">
      <div className="section-head">
        <h1 className="section-title">Estadísticas</h1>
      </div>
      <p className="cal-sub">Datos de los alumnos activos · tocá una barra para ver quiénes son</p>

      <div className="stat-grid">
        <Stat label="Alumnos activos" value={stats.total} />
        <Stat label="Edad promedio" value={stats.edadProm != null ? stats.edadProm + ' años' : '—'} sub={`${stats.edadesCargadas}/${stats.total} con fecha`} />
        <Stat label="Con medición" value={stats.conMedicion} />
      </div>

      <div className="estad-charts">
        <Barras titulo="Edades" datos={stats.charts.edades} onPick={abrir} vacio="Cargá la fecha de nacimiento en las fichas." />
        <Barras titulo="Deportes" datos={stats.charts.deportes} onPick={abrir} vacio="Cargá el deporte en las fichas." />
        <Barras titulo="Franja (AM / PM)" datos={stats.charts.franjas} onPick={abrir} vacio="Armá el roster de cada sesión (Calendario)." />
        <Barras titulo="Días por semana" datos={stats.charts.diasSemana} onPick={abrir} vacio="Armá el roster de cada sesión (Calendario)." />
        <Barras titulo="Antigüedad" datos={stats.charts.antig} onPick={abrir} vacio="Se completa con las altas nuevas (fecha de alta)." />
      </div>

      <div className="pk-card estad-ocupa">
        <div className="card-title">Ocupación por turno</div>
        {stats.turnos.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Todavía no hay sesiones Peak cargadas (Calendario).</p>
        ) : stats.ocupTotal === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Armá el roster de cada sesión (Calendario → tocá una franja → alumnos) y acá vas a ver cuántos vienen a cada turno.
          </p>
        ) : (
          <>
            <p className="cal-sub" style={{ marginTop: -2 }}>
              {stats.ocupTotal} lugares ocupados · {stats.turnos.length} turnos
              {stats.turnoLleno && stats.turnoLleno.n > 0 ? ` · más lleno: ${stats.turnoLleno.label} (${stats.turnoLleno.n})` : ''}
            </p>
            {(() => {
              const max = Math.max(1, ...stats.turnos.map((t) => t.n))
              return stats.turnos.map((t) => (
                <button
                  key={t.id}
                  className="estad-bar"
                  onClick={() => abrir('Turno', { label: `${t.label} · ${t.profe}`, ids: t.ids })}
                  disabled={!t.ids.length}
                >
                  <span className="estad-bar-lbl" title={t.profe}>
                    <span className="ocupa-dot" style={{ background: t.color }} /> {t.label}
                  </span>
                  <span className="estad-bar-track">
                    <span className="estad-bar-fill" style={{ width: (t.n / max) * 100 + '%' }} />
                  </span>
                  <span className="estad-bar-num">{t.n}</span>
                </button>
              ))
            })()}
          </>
        )}
      </div>

      {drill && (
        <div className="estad-drill" onClick={() => setDrill(null)}>
          <div className="estad-drill-box" onClick={(e) => e.stopPropagation()}>
            <div className="estad-drill-head">
              <b>{drill.titulo}</b> <span className="muted">({drill.items.length})</span>
              <button className="btn-ghost" onClick={() => setDrill(null)}>Cerrar</button>
            </div>
            <div className="estad-drill-list">
              {drill.items.map((a) => (
                <button key={a.id} className="mini-row mini-row-btn" onClick={() => { setDrill(null); onIrAlumno && onIrAlumno(a.id) }}>
                  <span>{a.nombre}</span>
                  <span className="muted">ver ficha →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function Barras({ titulo, datos, onPick, vacio }) {
  const hayDatos = datos.some((d) => d.n > 0)
  const max = Math.max(1, ...datos.map((d) => d.n))
  return (
    <div className="pk-card estad-chart">
      <div className="card-title">{titulo}</div>
      {!hayDatos ? (
        <p className="muted" style={{ margin: 0 }}>{vacio}</p>
      ) : (
        datos.map((d) => (
          <button key={d.label} className="estad-bar" onClick={() => onPick(titulo, d)} disabled={!d.ids.length}>
            <span className="estad-bar-lbl">{d.label}</span>
            <span className="estad-bar-track">
              <span className="estad-bar-fill" style={{ width: (d.n / max) * 100 + '%' }} />
            </span>
            <span className="estad-bar-num">{d.n}</span>
          </button>
        ))
      )}
    </div>
  )
}
