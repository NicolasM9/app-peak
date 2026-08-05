import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import { hoyISO } from '../lib/domain'

const TURNOS = [
  { key: '08:00', label: '8:00' },
  { key: '09:30', label: '9:30' },
  { key: '16:45', label: '16:45' },
  { key: '18:15', label: '18:15' },
  { key: '19:45', label: '19:45' },
]
const HORAS_TURNO = 1.5
const DIAS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
]
const COLORS = ['#2f6fb0', '#1f8f78', '#6d4bd0', '#b9791a', '#b3557a', '#3a7d44', '#c15b3f']

function diasEntre(desde, hasta) {
  if (!desde || !hasta) return 0
  const d = (new Date(hasta) - new Date(desde)) / 86400000 + 1
  return d > 0 ? d : 0
}

export default function Horas({ esAdmin }) {
  const [profes, setProfes] = useState([])
  const [turnos, setTurnos] = useState([])
  const [vacaciones, setVacaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // { dia, turnoKey, label }
  const [vacForm, setVacForm] = useState(false)
  const [vac, setVac] = useState({ profe_id: '', desde: hoyISO(), hasta: hoyISO(), nota: '' })
  const [confirmVac, setConfirmVac] = useState(null)

  async function load(showLoading) {
    if (showLoading) setLoading(true)
    const [{ data: pr }, { data: tu }, { data: va }] = await Promise.all([
      supabase.from('profes_publico').select('id, nombre').order('id'),
      supabase.from('turnos').select('id, profe_id, dia, horario, horas'),
      supabase.from('vacaciones').select('*').order('inicio', { ascending: false }),
    ])
    setProfes(pr || [])
    setTurnos(tu || [])
    setVacaciones(va || [])
    setLoading(false)
  }

  useEffect(() => {
    load(true)
  }, [])

  const colorOf = (id) => COLORS[Math.max(0, profes.findIndex((p) => p.id === id)) % COLORS.length]
  const nombreOf = (id) => profes.find((p) => p.id === id)?.nombre || '—'
  const cover = (dia, key) => turnos.filter((t) => t.dia === dia && t.horario === key)

  async function toggleProfe(dia, key, profeId) {
    const ya = turnos.find((t) => t.dia === dia && t.horario === key && t.profe_id === profeId)
    if (ya) await supabase.from('turnos').delete().eq('id', ya.id)
    else await supabase.from('turnos').insert({ profe_id: profeId, dia, horario: key, horas: HORAS_TURNO })
    await load()
  }

  async function guardarVac(e) {
    e.preventDefault()
    if (!vac.profe_id) return
    const payload = {
      profe_id: Number(vac.profe_id),
      inicio: vac.desde,
      fin: vac.hasta,
      dias_correspondientes: diasEntre(vac.desde, vac.hasta),
      exceso: vac.nota.trim() || null,
    }
    await supabase.from('vacaciones').insert(payload)
    setVac({ profe_id: '', desde: hoyISO(), hasta: hoyISO(), nota: '' })
    setVacForm(false)
    await load()
  }

  async function borrarVac(id) {
    await supabase.from('vacaciones').delete().eq('id', id)
    setConfirmVac(null)
    await load()
  }

  const horasProfe = {}
  turnos.forEach((t) => {
    horasProfe[t.profe_id] = (horasProfe[t.profe_id] || 0) + Number(t.horas || HORAS_TURNO)
  })

  return (
    <div className="horas">
      <h1 className="section-title">Horas</h1>
      <p className="cal-sub">Rotación semanal de turnos y vacaciones</p>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          <div className="cal-scroll">
            <table className="horas-tabla">
              <thead>
                <tr>
                  <th className="ht-turno">Turno</th>
                  {DIAS.map((d) => (
                    <th key={d.key}>{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TURNOS.map((t) => (
                  <tr key={t.key}>
                    <td className="ht-turno">{t.label}</td>
                    {DIAS.map((d) => {
                      const gente = cover(d.key, t.key)
                      const activo = editing && editing.dia === d.key && editing.turnoKey === t.key
                      return (
                        <td
                          key={d.key}
                          className={`ht-cell ${esAdmin ? 'clickable' : ''} ${activo ? 'activo' : ''}`}
                          onClick={() => esAdmin && setEditing({ dia: d.key, turnoKey: t.key, label: `${d.label} ${t.label}` })}
                        >
                          {gente.length === 0 ? (
                            esAdmin ? <span className="ht-plus">+</span> : null
                          ) : (
                            gente.map((g) => (
                              <span key={g.id} className="ht-chip" style={{ background: colorOf(g.profe_id) }}>
                                {nombreOf(g.profe_id)}
                              </span>
                            ))
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editing && esAdmin && (
            <div className="ht-editor">
              <div className="ht-editor-head">
                <b>{editing.label}</b> · ¿quién cubre?
                <button className="btn-ghost" onClick={() => setEditing(null)}>Listo</button>
              </div>
              <div className="ht-editor-profes">
                {profes.map((p) => {
                  const on = !!turnos.find((t) => t.dia === editing.dia && t.horario === editing.turnoKey && t.profe_id === p.id)
                  return (
                    <button
                      key={p.id}
                      className={`ht-toggle ${on ? 'on' : ''}`}
                      style={on ? { background: colorOf(p.id), borderColor: colorOf(p.id) } : {}}
                      onClick={() => toggleProfe(editing.dia, editing.turnoKey, p.id)}
                    >
                      {p.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="cal-sub" style={{ marginTop: 18, marginBottom: 8 }}>Horas por profe (semana)</div>
          <div className="ht-totales">
            {profes.map((p) => (
              <span key={p.id} className="ht-total">
                <span className="cal-dot" style={{ background: colorOf(p.id), borderRadius: '50%' }} />
                {p.nombre} <b>{horasProfe[p.id] ? Math.round(horasProfe[p.id] * 10) / 10 : 0} h</b>
              </span>
            ))}
          </div>

          <div className="section-subhead" style={{ marginTop: 24 }}>
            <h2>Vacaciones</h2>
            {esAdmin && !vacForm && (
              <button className="btn-primary" onClick={() => setVacForm(true)}>+ Agregar</button>
            )}
          </div>

          {vacForm && (
            <form className="form" onSubmit={guardarVac}>
              <div className="field-row">
                <label className="field">
                  <span>Profe</span>
                  <select value={vac.profe_id} onChange={(e) => setVac({ ...vac, profe_id: e.target.value })}>
                    <option value="">— Elegí —</option>
                    {profes.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Desde</span>
                  <input type="date" value={vac.desde} onChange={(e) => setVac({ ...vac, desde: e.target.value })} />
                </label>
                <label className="field">
                  <span>Hasta</span>
                  <input type="date" value={vac.hasta} onChange={(e) => setVac({ ...vac, hasta: e.target.value })} />
                </label>
              </div>
              <label className="field">
                <span>Nota (opcional)</span>
                <input value={vac.nota} onChange={(e) => setVac({ ...vac, nota: e.target.value })} placeholder="Ej: campamento, se cubre con Octi" />
              </label>
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setVacForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          )}

          {vacaciones.length === 0 ? (
            <p className="muted">No hay vacaciones cargadas.</p>
          ) : (
            <ul className="pago-list">
              {vacaciones.map((v) => (
                <li key={v.id} className="pago-row">
                  <div className="pago-info">
                    <span className="pago-venc">{nombreOf(v.profe_id)}</span>
                    <span className="pago-sub">
                      {formatFecha(v.inicio)} → {formatFecha(v.fin)} · {v.dias_correspondientes || diasEntre(v.inicio, v.fin)} días
                      {v.exceso ? ` · ${v.exceso}` : ''}
                    </span>
                  </div>
                  {esAdmin && (confirmVac === v.id ? (
                    <div className="pago-confirm">
                      <span>¿Borrar?</span>
                      <button className="confirm-si" onClick={() => borrarVac(v.id)}>Sí</button>
                      <button className="confirm-no" onClick={() => setConfirmVac(null)}>No</button>
                    </div>
                  ) : (
                    <button className="pago-del" aria-label="Borrar" onClick={() => setConfirmVac(v.id)}>✕</button>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
