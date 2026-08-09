import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { precioMensual, estadoMesActual, ESTADO_INFO, hoyISO } from '../lib/domain'
import AlumnoForm from './AlumnoForm'
import AlumnoDetalle from './AlumnoDetalle'
import CargaTelefonos from './CargaTelefonos'
import CargaDatos from './CargaDatos'

export default function Alumnos({ autor, abrir, onAbierto }) {
  const [alumnos, setAlumnos] = useState([])
  const [planes, setPlanes] = useState([])
  const [pagosByAlumno, setPagosByAlumno] = useState({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showInactivos, setShowInactivos] = useState(false)
  const [soloDeudores, setSoloDeudores] = useState(false)
  const [view, setView] = useState({ name: 'list' })
  const [confirmBaja, setConfirmBaja] = useState(null)

  async function load() {
    setLoading(true)
    const [{ data: al }, { data: pl }, { data: pg }] = await Promise.all([
      supabase
        .from('alumnos')
        .select(
          'id, nombre, telefono, fecha_nacimiento, deporte, estado, plan_id, ajuste_motivo, ajuste_monto, modalidad_rutina, medicion_nutricional, paga_directo_profe, estado_fisico, lesion_detalle, lesion_desde, objetivos, planes(nombre, precio_mensual)',
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

  useEffect(() => {
    if (abrir) {
      setView({ name: 'detalle', alumnoId: abrir })
      onAbierto && onAbierto()
    }
  }, [abrir])

  function backTo(alumnoId) {
    return alumnoId ? { name: 'detalle', alumnoId } : { name: 'list' }
  }

  // Alta/baja rápida desde la lista, sin entrar a editar (actualiza en el lugar)
  async function toggleEstado(a) {
    const nuevo = a.estado === 'activo' ? 'inactivo' : 'activo'
    const patch = { estado: nuevo, fecha_baja: nuevo === 'inactivo' ? hoyISO() : null }
    setConfirmBaja(null)
    const { error } = await supabase.from('alumnos').update(patch).eq('id', a.id)
    if (!error) setAlumnos((list) => list.map((x) => (x.id === a.id ? { ...x, ...patch } : x)))
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

  if (view.name === 'telefonos') {
    return (
      <CargaTelefonos
        onDone={async () => { await load(); setView({ name: 'list' }) }}
        onCancel={() => setView({ name: 'list' })}
      />
    )
  }

  if (view.name === 'datos') {
    return (
      <CargaDatos
        onDone={async () => { await load(); setView({ name: 'list' }) }}
        onCancel={() => setView({ name: 'list' })}
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
          </button>{' '}
          {loading ? 'Cargando…' : 'No se encontró el alumno.'}
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

  // Deudor del mes = alumno activo que paga a Peak y todavía no pagó este mes
  const esDeudor = (a) =>
    a.estado === 'activo' && !a.paga_directo_profe && estadoMesActual(pagosByAlumno[a.id]) !== 'al_dia'
  const filtrados = alumnos
    .filter((a) => showInactivos || a.estado === 'activo')
    .filter((a) => a.nombre.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((a) => !soloDeudores || esDeudor(a))
  const activos = alumnos.filter((a) => a.estado === 'activo').length
  const deudoresCount = alumnos.filter(esDeudor).length

  return (
    <div className="alumnos">
      <div className="section-head">
        <h1 className="section-title">Alumnos</h1>
        <div className="section-head-actions">
          <button className="btn-ghost" onClick={() => setView({ name: 'datos' })}>
            📋 Cargar datos
          </button>
          <button className="btn-ghost" onClick={() => setView({ name: 'telefonos' })}>
            ☎ Teléfonos
          </button>
          <button className="btn-primary" onClick={() => setView({ name: 'form' })}>
            + Nuevo
          </button>
        </div>
      </div>

      <input
        className="search"
        placeholder="Buscar por nombre…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="list-meta">
        <span>{activos} activos{deudoresCount > 0 && <> · <b style={{ color: '#f0999a' }}>{deudoresCount} deben</b></>}</span>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {deudoresCount > 0 && (
            <label className="switch-inline">
              <input
                type="checkbox"
                checked={soloDeudores}
                onChange={(e) => setSoloDeudores(e.target.checked)}
              />
              Solo deudores
            </label>
          )}
          <label className="switch-inline">
            <input
              type="checkbox"
              checked={showInactivos}
              onChange={(e) => setShowInactivos(e.target.checked)}
            />
            Ver inactivos
          </label>
        </div>
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
            const estado = a.estado !== 'activo' || a.paga_directo_profe
              ? 'sin_pagos'
              : estadoMesActual(pagosByAlumno[a.id])
            const info = ESTADO_INFO[estado]
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
                    {a.paga_directo_profe ? ' · directo al profe' : ''}
                  </span>
                </div>
                <div className="alumno-right">
                  <span className="alumno-price">{formatARS(precioMensual(a))}</span>
                  {a.estado === 'inactivo' && <span className="tag-inactive">inactivo</span>}
                </div>
                <div className="alumno-estado" onClick={(e) => e.stopPropagation()}>
                  {confirmBaja === a.id ? (
                    <span className="baja-confirm">
                      <button className="confirm-si" onClick={() => toggleEstado(a)}>Sí</button>
                      <button className="confirm-no" onClick={() => setConfirmBaja(null)}>No</button>
                    </span>
                  ) : a.estado === 'activo' ? (
                    <button className="estado-btn baja" title="Dar de baja" onClick={() => setConfirmBaja(a.id)}>Baja</button>
                  ) : (
                    <button className="estado-btn alta" title="Reactivar" onClick={() => toggleEstado(a)}>Alta</button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
