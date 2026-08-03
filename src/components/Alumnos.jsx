import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { precioMensual, estadoAlumno, ESTADO_INFO } from '../lib/domain'
import AlumnoForm from './AlumnoForm'
import AlumnoDetalle from './AlumnoDetalle'

export default function Alumnos({ autor }) {
  const [alumnos, setAlumnos] = useState([])
  const [planes, setPlanes] = useState([])
  const [pagosByAlumno, setPagosByAlumno] = useState({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showInactivos, setShowInactivos] = useState(false)
  const [view, setView] = useState({ name: 'list' })

  async function load() {
    setLoading(true)
    const [{ data: al }, { data: pl }, { data: pg }] = await Promise.all([
      supabase
        .from('alumnos')
        .select(
          'id, nombre, telefono, fecha_nacimiento, deporte, estado, plan_id, ajuste_motivo, ajuste_monto, modalidad_rutina, medicion_nutricional, estado_fisico, lesion_detalle, lesion_desde, planes(nombre, precio_mensual)',
        )
        .order('nombre'),
      supabase.from('planes').select('id, nombre, precio_mensual, frecuencia_max').order('id'),
      supabase.from('pagos').select('alumno_id, vencimiento, fecha_pago'),
    ])
    setAlumnos(al || [])
    setPlanes(pl || [])
    const map = {}
    ;(pg || []).forEach((p) => {
      ;(map[p.alumno_id] ||= []).push(p)
    })
    setPagosByAlumno(map)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function backTo(alumnoId) {
    return alumnoId ? { name: 'detalle', alumnoId } : { name: 'list' }
  }

  if (view.name === 'form') {
    return (
      <AlumnoForm
        alumno={view.alumno}
        planes={planes}
        onDone={async () => {
          await load()
          setView(backTo(view.alumno?.id))
        }}
        onCancel={() => setView(backTo(view.alumno?.id))}
      />
    )
  }

  if (view.name === 'detalle') {
    const alumno = alumnos.find((a) => a.id === view.alumnoId)
    if (!alumno) {
      return (
        <p className="muted">
          <button className="btn-back" onClick={() => setView({ name: 'list' })}>
            ← Volver
          </button>
        </p>
      )
    }
    return (
      <AlumnoDetalle
        alumno={alumno}
        onBack={() => setView({ name: 'list' })}
        onEdit={() => setView({ name: 'form', alumno })}
        onChanged={load}
        autor={autor}
      />
    )
  }

  const filtrados = alumnos
    .filter((a) => showInactivos || a.estado === 'activo')
    .filter((a) => a.nombre.toLowerCase().includes(q.trim().toLowerCase()))
  const activos = alumnos.filter((a) => a.estado === 'activo').length

  return (
    <div className="alumnos">
      <div className="section-head">
        <h1 className="section-title">Alumnos</h1>
        <button className="btn-primary" onClick={() => setView({ name: 'form' })}>
          + Nuevo
        </button>
      </div>

      <input
        className="search"
        placeholder="Buscar por nombre…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="list-meta">
        <span>{activos} activos</span>
        <label className="switch-inline">
          <input
            type="checkbox"
            checked={showInactivos}
            onChange={(e) => setShowInactivos(e.target.checked)}
          />
          Ver inactivos
        </label>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="muted">
          {alumnos.length === 0
            ? 'No hay alumnos todavía. Tocá “+ Nuevo” para cargar el primero.'
            : 'No hay resultados para esa búsqueda.'}
        </p>
      ) : (
        <ul className="alumno-list">
          {filtrados.map((a) => {
            const info = ESTADO_INFO[estadoAlumno(pagosByAlumno[a.id])]
            return (
              <li
                key={a.id}
                className={`alumno-row ${a.estado === 'inactivo' ? 'is-inactive' : ''}`}
                onClick={() => setView({ name: 'detalle', alumnoId: a.id })}
              >
                <span className="dot" style={{ background: info.dot }} title={info.label} />
                <div className="alumno-info">
                  <span className="alumno-name">{a.nombre}</span>
                  <span className="alumno-sub">
                    {a.planes?.nombre || 'Sin plan'}
                    {a.medicion_nutricional ? ' · con medición' : ''}
                  </span>
                </div>
                <div className="alumno-right">
                  <span className="alumno-price">{formatARS(precioMensual(a))}</span>
                  {a.estado === 'inactivo' && <span className="tag-inactive">inactivo</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
