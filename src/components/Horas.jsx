import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import { hoyISO } from '../lib/domain'
import { syncCalendarioDesdeHoras } from '../lib/syncTurnos'

const TURNOS = [
  { key: '08:00', label: '8:00' },
  { key: '09:30', label: '9:30' },
  { key: '16:45', label: '16:45' },
  { key: '18:00', label: '18:00' },
  { key: '19:30', label: '19:30' },
]
const HORAS_TURNO = 1.5
const AM = ['08:00', '09:30']
const PM = ['16:45', '18:00', '19:30']
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
  const [carga, setCarga] = useState(false)
  const [cargaProfe, setCargaProfe] = useState('')
  const [cargaTurnos, setCargaTurnos] = useState([])
  const [cargaDias, setCargaDias] = useState([])
  const [baseline, setBaseline] = useState({ favor: 'iguales', turnos: 0 })
  const [editBase, setEditBase] = useState(false)
  const [baseForm, setBaseForm] = useState({ favor: 'Eze', turnos: 0 })

  async function load(showLoading) {
    if (showLoading) setLoading(true)
    const [{ data: pr }, { data: tu }, { data: va }, { data: cfg }] = await Promise.all([
      supabase.from('profes_publico').select('id, nombre').order('id'),
      supabase.from('turnos').select('id, profe_id, dia, horario, horas'),
      supabase.from('vacaciones').select('*').order('inicio', { ascending: false }),
      supabase.from('config').select('valor').eq('clave', 'dif_nico_eze').maybeSingle(),
    ])
    setProfes(pr || [])
    setTurnos(tu || [])
    setVacaciones(va || [])
    if (cfg?.valor) setBaseline({ favor: cfg.valor.favor || 'iguales', turnos: Number(cfg.valor.turnos || 0) })
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
    // Sincroniza el Calendario con el profe resultante del turno (uno solo)
    const { data: tu } = await supabase.from('turnos').select('profe_id').eq('dia', dia).eq('horario', key)
    await syncCalendarioDesdeHoras(dia, key, tu && tu.length ? tu[0].profe_id : null)
    await load()
  }

  function toggleEn(list, setList, val) {
    setList((l) => (l.includes(val) ? l.filter((x) => x !== val) : [...l, val]))
  }
  function toggleGrupo(grupo) {
    setCargaTurnos((l) =>
      grupo.every((k) => l.includes(k)) ? l.filter((k) => !grupo.includes(k)) : [...new Set([...l, ...grupo])],
    )
  }
  function todosDias() {
    setCargaDias((l) => (l.length === DIAS.length ? [] : DIAS.map((d) => d.key)))
  }
  async function aplicarCarga(accion) {
    const pid = Number(cargaProfe)
    if (!pid || cargaTurnos.length === 0 || cargaDias.length === 0) return
    if (accion === 'agregar') {
      const nuevos = []
      for (const dia of cargaDias)
        for (const key of cargaTurnos)
          if (!turnos.find((t) => t.dia === dia && t.horario === key && t.profe_id === pid))
            nuevos.push({ profe_id: pid, dia, horario: key, horas: HORAS_TURNO })
      if (nuevos.length) await supabase.from('turnos').insert(nuevos)
    } else {
      const ids = []
      for (const dia of cargaDias)
        for (const key of cargaTurnos) {
          const t = turnos.find((x) => x.dia === dia && x.horario === key && x.profe_id === pid)
          if (t) ids.push(t.id)
        }
      if (ids.length) await supabase.from('turnos').delete().in('id', ids)
    }
    // Sincroniza el Calendario con el profe resultante de cada celda tocada
    for (const dia of cargaDias)
      for (const key of cargaTurnos) {
        const { data: tu } = await supabase.from('turnos').select('profe_id').eq('dia', dia).eq('horario', key)
        await syncCalendarioDesdeHoras(dia, key, tu && tu.length ? tu[0].profe_id : null)
      }
    await load()
  }

  async function guardarBaseline() {
    const valor = { favor: baseForm.favor, turnos: Number(baseForm.turnos || 0) }
    await supabase.from('config').upsert({ clave: 'dif_nico_eze', valor, updated_at: new Date().toISOString() })
    setBaseline({ favor: valor.favor, turnos: valor.turnos })
    setEditBase(false)
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
  const nicoP = profes.find((p) => p.nombre === 'Nico')
  const ezeP = profes.find((p) => p.nombre === 'Eze')
  const turnosDe = (id) => turnos.filter((t) => t.profe_id === id).length

  return (
    <div className="horas">
      <h1 className="section-title">Horas</h1>
      <p className="cal-sub">Rotación semanal de turnos y vacaciones</p>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          {esAdmin && (
            <div className="ht-carga">
              <button className="btn-ghost ht-carga-toggle" onClick={() => setCarga((c) => !c)}>
                {carga ? '✕ Cerrar carga rápida' : '⚡ Carga rápida de la semana'}
              </button>
              {carga && (
                <div className="ht-carga-panel">
                  <label className="field">
                    <span>Profe</span>
                    <select value={cargaProfe} onChange={(e) => setCargaProfe(e.target.value)}>
                      <option value="">— Elegí —</option>
                      {profes.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </label>

                  <div className="ht-carga-grupo">
                    <span className="ht-carga-lbl">Turnos</span>
                    <div className="ht-chips">
                      <button type="button" className={`ht-pick ${AM.every((k) => cargaTurnos.includes(k)) ? 'on' : ''}`} onClick={() => toggleGrupo(AM)}>AM</button>
                      <button type="button" className={`ht-pick ${PM.every((k) => cargaTurnos.includes(k)) ? 'on' : ''}`} onClick={() => toggleGrupo(PM)}>PM</button>
                      <span className="ht-sep" />
                      {TURNOS.map((t) => (
                        <button key={t.key} type="button" className={`ht-pick ${cargaTurnos.includes(t.key) ? 'on' : ''}`} onClick={() => toggleEn(cargaTurnos, setCargaTurnos, t.key)}>{t.label}</button>
                      ))}
                    </div>
                  </div>

                  <div className="ht-carga-grupo">
                    <span className="ht-carga-lbl">Días</span>
                    <div className="ht-chips">
                      <button type="button" className={`ht-pick ${cargaDias.length === DIAS.length ? 'on' : ''}`} onClick={todosDias}>Todos</button>
                      <span className="ht-sep" />
                      {DIAS.map((d) => (
                        <button key={d.key} type="button" className={`ht-pick ${cargaDias.includes(d.key) ? 'on' : ''}`} onClick={() => toggleEn(cargaDias, setCargaDias, d.key)}>{d.label}</button>
                      ))}
                    </div>
                  </div>

                  <div className="ht-carga-acciones">
                    <button type="button" className="btn-primary" disabled={!cargaProfe || !cargaTurnos.length || !cargaDias.length} onClick={() => aplicarCarga('agregar')}>Agregar turnos</button>
                    <button type="button" className="btn-ghost" disabled={!cargaProfe || !cargaTurnos.length || !cargaDias.length} onClick={() => aplicarCarga('quitar')}>Quitar</button>
                  </div>
                  <p className="ht-carga-hint">Elegí el profe, tocá AM o PM (o turnos sueltos) y los días, y agregás todo de una.</p>
                </div>
              )}
            </div>
          )}

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

          {esAdmin && nicoP && ezeP && (() => {
            const nT = turnosDe(nicoP.id)
            const eT = turnosDe(ezeP.id)
            const semana = eT - nT // + = Eze adelante esta semana
            const base = baseline.favor === 'Eze' ? baseline.turnos : baseline.favor === 'Nico' ? -baseline.turnos : 0
            const total = base + semana
            const fmt = (signed) => ({
              quien: signed === 0 ? null : signed > 0 ? 'Eze' : 'Nico',
              t: Math.abs(signed),
              h: Math.round(Math.abs(signed) * HORAS_TURNO * 10) / 10,
            })
            const S = fmt(semana)
            const T = fmt(total)
            return (
              <div className="ht-dif">
                <div className="ht-dif-head">
                  Diferencia Nico ↔ Eze <span className="ht-dif-priv">🔒 privado</span>
                </div>
                <div className="ht-dif-row">
                  <span>Nico: <b>{nT} turnos</b></span>
                  <span>Eze: <b>{eT} turnos</b></span>
                </div>

                <div className="ht-dif-linea">
                  <span className="ht-dif-lbl">Esta semana</span>
                  <span>
                    {S.quien ? (
                      <><b>{S.quien}</b> +{S.t} turnos <span className="muted">({S.h} h)</span></>
                    ) : (
                      <b>iguales</b>
                    )}
                  </span>
                </div>

                <div className="ht-dif-linea">
                  <span className="ht-dif-lbl">Arrastre previo</span>
                  {editBase ? (
                    <span className="ht-base-form">
                      <select value={baseForm.favor} onChange={(e) => setBaseForm({ ...baseForm, favor: e.target.value })}>
                        <option value="Eze">Eze +</option>
                        <option value="Nico">Nico +</option>
                        <option value="iguales">iguales</option>
                      </select>
                      {baseForm.favor !== 'iguales' && (
                        <input
                          type="number"
                          value={baseForm.turnos}
                          onChange={(e) => setBaseForm({ ...baseForm, turnos: e.target.value })}
                          style={{ width: 60 }}
                          inputMode="numeric"
                        />
                      )}
                      <button className="confirm-si" onClick={guardarBaseline}>OK</button>
                      <button className="confirm-no" onClick={() => setEditBase(false)}>✕</button>
                    </span>
                  ) : (
                    <span>
                      {baseline.favor === 'iguales' || !baseline.turnos ? (
                        <b>iguales</b>
                      ) : (
                        <><b>{baseline.favor}</b> +{baseline.turnos} turnos</>
                      )}
                      <button className="ht-base-edit" onClick={() => { setBaseForm(baseline); setEditBase(true) }}>editar</button>
                    </span>
                  )}
                </div>

                <div className="ht-dif-total">
                  {T.quien === null ? (
                    <>Total: están <b>iguales</b> 🤝</>
                  ) : (
                    <>Total: <b>{T.quien}</b> +<b>{T.t} turno{T.t === 1 ? '' : 's'}</b> = <b>{T.h} h reloj</b></>
                  )}
                </div>
                <p className="ht-dif-nota">"Esta semana" sale de la grilla · el "arrastre" lo ajustás vos.</p>
              </div>
            )
          })()}

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
