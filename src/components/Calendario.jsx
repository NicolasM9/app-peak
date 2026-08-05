import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SesionForm from './SesionForm'

const DIAS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
]

const START_HOUR = 7
const END_HOUR = 22
const PXH = 46 // píxeles por hora

export const TIPO_INFO = {
  peak: { label: 'Peak', bg: '#1a4fa3' },
  personalizado: { label: 'Personalizado', bg: '#6d4bd0' },
  grupo: { label: 'Grupo', bg: '#1f8f63' },
  filmacion: { label: 'Filmación', bg: '#5b6675' },
  otro: { label: 'Otro', bg: '#33455f' },
}

function toMin(t) {
  const [h, m] = (t || '00:00').split(':')
  return Number(h) * 60 + Number(m)
}
function fmtHora(t) {
  const s = (t || '').slice(0, 5)
  return s.replace(/^0/, '')
}

// Ubica las sesiones de un día en columnas para que las superpuestas no se pisen
function acomodar(lista) {
  const s = lista
    .map((x) => ({ ...x, ini: toMin(x.hora_inicio), fin: toMin(x.hora_fin) }))
    .sort((a, b) => a.ini - b.ini || a.fin - b.fin)
  let i = 0
  while (i < s.length) {
    let j = i
    let maxFin = s[i].fin
    const cluster = [s[i]]
    while (j + 1 < s.length && s[j + 1].ini < maxFin) {
      j++
      cluster.push(s[j])
      maxFin = Math.max(maxFin, s[j].fin)
    }
    const cols = []
    cluster.forEach((ev) => {
      let col = cols.findIndex((finCol) => finCol <= ev.ini)
      if (col === -1) {
        col = cols.length
        cols.push(ev.fin)
      } else {
        cols[col] = ev.fin
      }
      ev._col = col
    })
    cluster.forEach((ev) => (ev._n = cols.length))
    i = j + 1
  }
  return s
}

export default function Calendario({ esAdmin }) {
  const [sesiones, setSesiones] = useState([])
  const [profes, setProfes] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState({ name: 'grid' })

  async function load() {
    setLoading(true)
    const [{ data: ses }, { data: pr }] = await Promise.all([
      supabase.from('sesiones').select('*'),
      supabase.from('profes_publico').select('id, nombre'),
    ])
    setSesiones(ses || [])
    setProfes(pr || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const profeNombre = (id) => profes.find((p) => p.id === id)?.nombre || ''

  if (view.name === 'form') {
    return (
      <SesionForm
        sesion={view.sesion}
        profes={profes}
        onDone={async () => {
          await load()
          setView({ name: 'grid' })
        }}
        onCancel={() => setView({ name: 'grid' })}
      />
    )
  }

  const horas = []
  for (let h = START_HOUR; h <= END_HOUR; h++) horas.push(h)
  const altura = (END_HOUR - START_HOUR) * PXH

  return (
    <div className="calendario">
      <div className="section-head">
        <h1 className="section-title">Calendario</h1>
        {esAdmin && (
          <button className="btn-primary" onClick={() => setView({ name: 'form' })}>
            + Agregar sesión
          </button>
        )}
      </div>
      <p className="cal-sub">Semana tipo · horarios habituales del centro</p>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="cal-scroll">
          <div className="cal-grid" style={{ '--filas': altura + 'px' }}>
            <div className="cal-corner" />
            {DIAS.map((d) => (
              <div key={d.key} className="cal-dhead">{d.label}</div>
            ))}

            <div className="cal-axis" style={{ height: altura }}>
              {horas.map((h) => (
                <div key={h} className="cal-hour" style={{ top: (h - START_HOUR) * PXH }}>
                  {fmtHora(String(h).padStart(2, '0') + ':00')}
                </div>
              ))}
            </div>

            {DIAS.map((d) => {
              const delDia = acomodar(sesiones.filter((s) => s.dia === d.key))
              return (
                <div key={d.key} className="cal-col" style={{ height: altura }}>
                  {horas.map((h) => (
                    <div key={h} className="cal-line" style={{ top: (h - START_HOUR) * PXH }} />
                  ))}
                  {delDia.map((s) => {
                    const info = TIPO_INFO[s.tipo] || TIPO_INFO.otro
                    const top = ((s.ini - START_HOUR * 60) / 60) * PXH
                    const alto = Math.max(((s.fin - s.ini) / 60) * PXH - 2, 26)
                    const width = 100 / s._n
                    return (
                      <button
                        key={s.id}
                        className="cal-ev"
                        onClick={() => esAdmin && setView({ name: 'form', sesion: s })}
                        style={{
                          top,
                          height: alto,
                          left: `calc(${s._col * width}% + 1px)`,
                          width: `calc(${width}% - 2px)`,
                          background: info.bg,
                          cursor: esAdmin ? 'pointer' : 'default',
                        }}
                        title={`${s.titulo} ${fmtHora(s.hora_inicio)}–${fmtHora(s.hora_fin)}`}
                      >
                        <span className="cal-ev-t">{s.titulo}</span>
                        <span className="cal-ev-h">
                          {fmtHora(s.hora_inicio)}–{fmtHora(s.hora_fin)}
                        </span>
                        {s.alumnos && <span className="cal-ev-a">{s.alumnos}</span>}
                        {profeNombre(s.profe_id) && (
                          <span className="cal-ev-p">{profeNombre(s.profe_id)}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="cal-legend">
        {Object.entries(TIPO_INFO).map(([k, v]) => (
          <span key={k} className="cal-legend-item">
            <span className="cal-dot" style={{ background: v.bg }} />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  )
}
