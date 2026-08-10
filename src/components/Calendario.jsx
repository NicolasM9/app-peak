import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SesionForm from './SesionForm'
import CargaSesiones from './CargaSesiones'
import GrillaSemanal from './GrillaSemanal'

const DIAS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

// Mismos colores que la pestaña Horas (por índice de profe ordenado por id)
const COLORS = ['#2f6fb0', '#1f8f78', '#6d4bd0', '#b9791a', '#b3557a', '#3a7d44', '#c15b3f']

export const TIPO_INFO = {
  peak: { label: 'Peak', bg: '#1a4fa3' },
  personalizado: { label: 'Personalizado', bg: '#6d4bd0' },
  grupo: { label: 'Grupo', bg: '#1f8f63' },
  filmacion: { label: 'Filmación', bg: '#5b6675' },
  bloqueo: { label: 'Bloqueo', bg: '#7a2f2f' },
  otro: { label: 'Otro', bg: '#33455f' },
}

function toMin(t) {
  const [h, m] = (t || '00:00').split(':')
  return Number(h) * 60 + Number(m)
}
function fmtHora(t) {
  return (t || '').slice(0, 5).replace(/^0/, '')
}

export default function Calendario({ esAdmin }) {
  const [sesiones, setSesiones] = useState([])
  const [profes, setProfes] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState({ name: 'grid' })
  const [modo, setModo] = useState('bloques') // 'bloques' | 'grilla'

  async function load() {
    setLoading(true)
    const [{ data: ses }, { data: pr }] = await Promise.all([
      supabase.from('sesiones').select('*'),
      supabase.from('profes_publico').select('id, nombre').order('id'),
    ])
    setSesiones(ses || [])
    setProfes(pr || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const colorOf = (id) => COLORS[Math.max(0, profes.findIndex((p) => p.id === id)) % COLORS.length]
  const nombreOf = (id) => profes.find((p) => p.id === id)?.nombre || '—'

  if (view.name === 'form') {
    return (
      <SesionForm
        sesion={view.sesion}
        profes={profes}
        onDone={async () => { await load(); setView({ name: 'grid' }) }}
        onCancel={() => setView(view.volver || { name: 'grid' })}
      />
    )
  }

  if (view.name === 'carga') {
    return (
      <CargaSesiones
        profes={profes}
        onDone={async () => { await load(); setView({ name: 'grid' }) }}
        onCancel={() => setView({ name: 'grid' })}
      />
    )
  }

  // Vista de una franja (AM/PM) de un día: lista las sesiones para editarlas
  if (view.name === 'franja') {
    const delDia = sesiones
      .filter((s) => s.dia === view.dia && (view.franja === 'am' ? toMin(s.hora_inicio) < 720 : toMin(s.hora_inicio) >= 720) && s.tipo === 'peak')
      .sort((a, b) => toMin(a.hora_inicio) - toMin(b.hora_inicio))
    const diaLabel = DIAS.find((d) => d.key === view.dia)?.label || ''
    return (
      <div className="calendario">
        <div className="section-head">
          <button className="btn-back" onClick={() => setView({ name: 'grid' })}>← Volver</button>
          {esAdmin && (
            <button className="btn-primary" onClick={() => setView({ name: 'form', sesion: { dia: view.dia, tipo: 'peak' }, volver: { name: 'franja', dia: view.dia, franja: view.franja } })}>
              + Agregar
            </button>
          )}
        </div>
        <h1 className="section-title">{diaLabel} · Peak {view.franja.toUpperCase()}</h1>
        <div className="cal-franja-list">
          {delDia.length === 0 ? (
            <p className="muted">No hay clases en esta franja.</p>
          ) : (
            delDia.map((s) => (
              <button
                key={s.id}
                className="cal-fl-row"
                onClick={() => esAdmin && setView({ name: 'form', sesion: s, volver: { name: 'franja', dia: view.dia, franja: view.franja } })}
                style={{ cursor: esAdmin ? 'pointer' : 'default' }}
              >
                <span className="cal-fl-hora">{fmtHora(s.hora_inicio)}–{fmtHora(s.hora_fin)}</span>
                <span className="cal-fl-profe" style={{ color: s.profe_id ? colorOf(s.profe_id) : '#8b94a6' }}>
                  {s.profe_id ? nombreOf(s.profe_id) : 'sin profe'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  const diasConData = DIAS.filter((d) => sesiones.some((s) => s.dia === d.key))

  return (
    <div className="calendario">
      <div className="section-head">
        <h1 className="section-title">Calendario</h1>
        {esAdmin && (
          <div className="section-head-actions">
            <button className="btn-ghost" onClick={() => setView({ name: 'carga' })}>⚡ Carga rápida</button>
            <button className="btn-primary" onClick={() => setView({ name: 'form', sesion: null })}>+ Agregar sesión</button>
          </div>
        )}
      </div>
      <div className="cal-modo">
        <button className={`cal-modo-btn ${modo === 'bloques' ? 'on' : ''}`} onClick={() => setModo('bloques')}>Bloques</button>
        <button className={`cal-modo-btn ${modo === 'grilla' ? 'on' : ''}`} onClick={() => setModo('grilla')}>🗓 Grilla</button>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : modo === 'grilla' ? (
        <GrillaSemanal
          sesiones={sesiones}
          colorOf={colorOf}
          nombreOf={nombreOf}
          esAdmin={esAdmin}
          onEdit={(s) => setView({ name: 'form', sesion: s, volver: { name: 'grid' } })}
          onCreate={(pre) => setView({ name: 'form', sesion: { ...pre, tipo: 'otro' }, volver: { name: 'grid' } })}
        />
      ) : diasConData.length === 0 ? (
        <p className="muted">No hay sesiones cargadas. {esAdmin ? 'Usá “⚡ Carga rápida” para armar la semana.' : ''}</p>
      ) : (
        <div className="cal-dias">
          {diasConData.map((d) => {
            const delDia = sesiones.filter((s) => s.dia === d.key)
            const am = delDia.filter((s) => s.tipo === 'peak' && toMin(s.hora_inicio) < 720)
            const pm = delDia.filter((s) => s.tipo === 'peak' && toMin(s.hora_inicio) >= 720)
            const otros = delDia.filter((s) => s.tipo !== 'peak')
            return (
              <div key={d.key} className="cal-dia-card">
                <div className="cal-dia-h">{d.label}</div>
                <div className="cal-franjas">
                  <Franja label="PEAK AM" sesiones={am} franja="am" dia={d.key} {...{ colorOf, nombreOf, esAdmin, setView }} />
                  <Franja label="PEAK PM" sesiones={pm} franja="pm" dia={d.key} {...{ colorOf, nombreOf, esAdmin, setView }} />
                </div>
                {otros.length > 0 && (
                  <div className="cal-otros">
                    {otros.map((s) => (
                      <button
                        key={s.id}
                        className="cal-otro"
                        style={{ background: (TIPO_INFO[s.tipo] || TIPO_INFO.otro).bg, cursor: esAdmin ? 'pointer' : 'default' }}
                        onClick={() => esAdmin && setView({ name: 'form', sesion: s })}
                      >
                        {s.titulo} · {fmtHora(s.hora_inicio)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Franja({ label, sesiones, franja, dia, colorOf, nombreOf, esAdmin, setView }) {
  const profeIds = [...new Set(sesiones.map((s) => s.profe_id).filter(Boolean))]
  const vacio = sesiones.length === 0
  const unico = profeIds.length === 1
  const bg = unico ? colorOf(profeIds[0]) : profeIds.length > 1 ? '#33455f' : 'transparent'
  return (
    <button
      className={`cal-franja ${vacio ? 'vacia' : ''}`}
      style={{ background: bg }}
      onClick={() => (!vacio || esAdmin) && setView({ name: 'franja', dia, franja })}
    >
      <span className="cal-franja-lbl">{label}</span>
      <span className="cal-franja-profe">
        {vacio ? '—' : profeIds.length ? profeIds.map(nombreOf).join(' · ') : 'sin profe'}
      </span>
      {!vacio && <span className="cal-franja-n">{sesiones.length} turno{sesiones.length === 1 ? '' : 's'}</span>}
    </button>
  )
}
