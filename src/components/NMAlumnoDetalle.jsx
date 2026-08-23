import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/format'
import { hoyISO } from '../lib/domain'

// Sparkline propia (misma que Evolución)
function Spark({ values, color, w = 110, h = 34 }) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 6) + 3
    const y = h - 3 - ((v - min) / span) * (h - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg className="ev-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
const r1 = (n) => Math.round(n * 10) / 10

export default function NMAlumnoDetalle({ alumno, onBack, onEdit, onChanged }) {
  const [pagos, setPagos] = useState([])
  const [progreso, setProgreso] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [loading, setLoading] = useState(true)

  const [nuevoObj, setNuevoObj] = useState('')
  const [pagoForm, setPagoForm] = useState(null)   // {mes,monto,fecha_pago,medio}
  const [progForm, setProgForm] = useState(null)   // {metrica,valor,unidad,fecha}

  async function load() {
    setLoading(true)
    const [{ data: pg }, { data: pr }, { data: ob }] = await Promise.all([
      supabase.from('nm_pagos').select('*').eq('nm_alumno_id', alumno.id).order('mes', { ascending: false }),
      supabase.from('nm_progreso').select('*').eq('nm_alumno_id', alumno.id).order('fecha'),
      supabase.from('nm_objetivos').select('*').eq('nm_alumno_id', alumno.id).order('created_at'),
    ])
    setPagos(pg || []); setProgreso(pr || []); setObjetivos(ob || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [alumno.id])

  // ---- objetivos ----
  async function addObjetivo(e) {
    e.preventDefault()
    if (!nuevoObj.trim()) return
    const { data } = await supabase.from('nm_objetivos')
      .insert({ nm_alumno_id: alumno.id, texto: nuevoObj.trim() }).select().single()
    if (data) setObjetivos((l) => [...l, data])
    setNuevoObj('')
  }
  async function toggleObj(o) {
    await supabase.from('nm_objetivos').update({ cumplido: !o.cumplido }).eq('id', o.id)
    setObjetivos((l) => l.map((x) => (x.id === o.id ? { ...x, cumplido: !x.cumplido } : x)))
  }
  async function delObj(id) {
    await supabase.from('nm_objetivos').delete().eq('id', id)
    setObjetivos((l) => l.filter((x) => x.id !== id))
  }

  // ---- pagos ----
  async function guardarPago(e) {
    e.preventDefault()
    const p = pagoForm
    if (!p.monto) return
    const { data } = await supabase.from('nm_pagos').insert({
      nm_alumno_id: alumno.id, mes: p.mes || null, monto: Number(p.monto),
      fecha_pago: p.fecha_pago || null, medio: p.medio || null,
    }).select().single()
    if (data) setPagos((l) => [data, ...l])
    setPagoForm(null)
  }
  async function delPago(id) {
    await supabase.from('nm_pagos').delete().eq('id', id)
    setPagos((l) => l.filter((x) => x.id !== id))
  }
  const totalPagos = pagos.reduce((s, p) => s + Number(p.monto || 0), 0)

  // ---- progreso ----
  async function guardarProg(e) {
    e.preventDefault()
    const p = progForm
    if (!p.metrica.trim() || p.valor === '') return
    const { data } = await supabase.from('nm_progreso').insert({
      nm_alumno_id: alumno.id, metrica: p.metrica.trim(), valor: Number(p.valor),
      unidad: p.unidad || null, fecha: p.fecha || hoyISO(),
    }).select().single()
    if (data) setProgreso((l) => [...l, data].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)))
    setProgForm(null)
  }
  async function delProg(id) {
    await supabase.from('nm_progreso').delete().eq('id', id)
    setProgreso((l) => l.filter((x) => x.id !== id))
  }

  // agrupar progreso por métrica
  const porMetrica = {}
  progreso.forEach((p) => { (porMetrica[p.metrica] ||= []).push(p) })
  const metricas = Object.entries(porMetrica).map(([metrica, arr]) => {
    const vals = arr.map((a) => Number(a.valor))
    const first = vals[0], last = vals[vals.length - 1]
    return { metrica, arr, vals, first, last, delta: last - first, unidad: arr[arr.length - 1].unidad, n: arr.length }
  })
  const metricasUsadas = [...new Set(progreso.map((p) => p.metrica))]

  return (
    <div className="nm-alu-det">
      <div className="section-head">
        <button className="btn-back" onClick={onBack}>← Alumnos online</button>
        <button className="btn-ghost" onClick={onEdit}>Editar datos</button>
      </div>
      <h1 className="section-title">{alumno.nombre}</h1>
      <p className="detalle-meta">
        {alumno.deporte || 'Sin deporte'}
        {alumno.inicio ? ` · desde ${formatFecha(alumno.inicio)}` : ''}
        {alumno.activo ? '' : <span className="tag-inactive">inactivo</span>}
      </p>
      {alumno.contacto && <div className="detalle-info"><span><b>Contacto:</b> {alumno.contacto}</span></div>}
      {alumno.objetivo && <div className="asis-linea"><b>🎯 Objetivo general:</b> {alumno.objetivo}</div>}
      {alumno.nota && <div className="asis-linea"><span className="muted">{alumno.nota}</span></div>}

      {/* OBJETIVOS */}
      <div className="section-subhead"><h2>Objetivos</h2></div>
      <form className="nm-inline-add" onSubmit={addObjetivo}>
        <input placeholder="Nuevo objetivo…" value={nuevoObj} onChange={(e) => setNuevoObj(e.target.value)} />
        <button className="btn-primary" type="submit" disabled={!nuevoObj.trim()}>Agregar</button>
      </form>
      {objetivos.length === 0 ? (
        <p className="muted">Sin objetivos todavía.</p>
      ) : (
        <ul className="nm-obj-list">
          {objetivos.map((o) => (
            <li key={o.id} className={`nm-obj ${o.cumplido ? 'ok' : ''}`}>
              <button className="nm-obj-check" onClick={() => toggleObj(o)} aria-label="Marcar">{o.cumplido ? '✓' : ''}</button>
              <span className="nm-obj-txt">{o.texto}</span>
              <button className="pago-del" onClick={() => delObj(o.id)} aria-label="Borrar">✕</button>
            </li>
          ))}
        </ul>
      )}

      {/* PAGOS */}
      <div className="section-subhead">
        <h2>Pagos</h2>
        {!pagoForm && <button className="btn-primary" onClick={() => setPagoForm({ mes: hoyISO().slice(0, 7), monto: '', fecha_pago: hoyISO(), medio: '' })}>+ Registrar</button>}
      </div>
      {pagos.length > 0 && <p className="cal-sub" style={{ marginTop: -4 }}>Total cobrado: <b>{formatARS(totalPagos)}</b> · {pagos.length} {pagos.length === 1 ? 'pago' : 'pagos'}</p>}
      {pagoForm && (
        <form className="form" onSubmit={guardarPago}>
          <div className="field-row">
            <label className="field"><span>Mes</span><input type="month" value={pagoForm.mes} onChange={(e) => setPagoForm({ ...pagoForm, mes: e.target.value })} /></label>
            <label className="field"><span>Monto</span><input type="number" inputMode="numeric" value={pagoForm.monto} onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })} /></label>
          </div>
          <div className="field-row">
            <label className="field"><span>Fecha de pago</span><input type="date" value={pagoForm.fecha_pago} onChange={(e) => setPagoForm({ ...pagoForm, fecha_pago: e.target.value })} /></label>
            <label className="field"><span>Medio</span><input value={pagoForm.medio} onChange={(e) => setPagoForm({ ...pagoForm, medio: e.target.value })} placeholder="transferencia / efectivo…" /></label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setPagoForm(null)}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      )}
      {pagos.length === 0 ? (
        <p className="muted">Sin pagos registrados.</p>
      ) : (
        <ul className="pago-list">
          {pagos.map((p) => (
            <li key={p.id} className="pago-row">
              <div className="pago-info">
                <span className="pago-venc">{p.mes || 'Sin mes'}</span>
                <span className="pago-sub">{p.fecha_pago ? `Pagado ${formatFecha(p.fecha_pago)}` : 'Sin fecha'}{p.medio ? ` · ${p.medio}` : ''}</span>
              </div>
              <div className="pago-right"><span className="pago-monto">{formatARS(p.monto)}</span></div>
              <button className="pago-del" onClick={() => delPago(p.id)} aria-label="Borrar">✕</button>
            </li>
          ))}
        </ul>
      )}

      {/* PROGRESO */}
      <div className="section-subhead">
        <h2>Progreso</h2>
        {!progForm && <button className="btn-primary" onClick={() => setProgForm({ metrica: '', valor: '', unidad: '', fecha: hoyISO() })}>+ Medición</button>}
      </div>
      <p className="cal-sub" style={{ marginTop: -4 }}>Cargá cualquier métrica (sentadilla, salto, peso…) y se dibuja sola la evolución.</p>
      {progForm && (
        <form className="form" onSubmit={guardarProg}>
          <div className="field-row">
            <label className="field"><span>Métrica</span>
              <input list="nm-metricas" value={progForm.metrica} onChange={(e) => setProgForm({ ...progForm, metrica: e.target.value })} placeholder="Ej: Sentadilla" />
              <datalist id="nm-metricas">{metricasUsadas.map((m) => <option key={m} value={m} />)}</datalist>
            </label>
            <label className="field"><span>Valor</span><input type="number" inputMode="decimal" value={progForm.valor} onChange={(e) => setProgForm({ ...progForm, valor: e.target.value })} /></label>
          </div>
          <div className="field-row">
            <label className="field"><span>Unidad</span><input value={progForm.unidad} onChange={(e) => setProgForm({ ...progForm, unidad: e.target.value })} placeholder="kg / cm / seg…" /></label>
            <label className="field"><span>Fecha</span><input type="date" value={progForm.fecha} onChange={(e) => setProgForm({ ...progForm, fecha: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setProgForm(null)}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      )}
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : metricas.length === 0 ? (
        <p className="muted">Sin mediciones todavía.</p>
      ) : (
        <div className="nm-metricas">
          {metricas.map((m) => {
            const mejora = m.last >= m.first
            return (
              <div key={m.metrica} className="nm-metrica">
                <div className="nm-metrica-head">
                  <span className="nm-metrica-nom">{m.metrica}</span>
                  <span className="nm-metrica-last">{r1(m.last)}{m.unidad ? ' ' + m.unidad : ''}</span>
                </div>
                <div className="nm-metrica-body">
                  {m.n > 1 ? (
                    <span className={`ev-delta ${m.delta === 0 ? 'neutro' : mejora ? 'sube' : 'baja'}`}>
                      {m.delta > 0 ? '+' : ''}{r1(m.delta)}{m.unidad ? ' ' + m.unidad : ''}
                    </span>
                  ) : <span className="ev-delta neutro">1 registro</span>}
                  <Spark values={m.vals.slice(-12)} color={m.n < 2 ? '#6b7280' : mejora ? '#4caf50' : '#ef4444'} />
                </div>
                <div className="nm-metrica-regs">
                  {m.arr.slice(-6).map((a) => (
                    <span key={a.id} className="nm-reg" onClick={() => delProg(a.id)} title="Tocar para borrar">
                      {formatFecha(a.fecha)}: <b>{r1(Number(a.valor))}</b>{a.unidad ? a.unidad : ''}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
