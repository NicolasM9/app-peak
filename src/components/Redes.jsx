import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DOWL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const TIPOS = [
  { value: 'historia', label: 'Historia', bg: '#b3557a' },
  { value: 'publicacion', label: 'Publicación', bg: '#2f6fb0' },
  { value: 'ambas', label: 'Historia + Publicación', bg: '#6d4bd0' },
]
const ESTADOS = [
  { value: 'idea', label: 'Idea' },
  { value: 'listo', label: 'Listo p/ subir' },
  { value: 'subido', label: 'Subido ✓' },
]
const tinfo = (t) => TIPOS.find((x) => x.value === t) || TIPOS[1]
const einfo = (e) => ESTADOS.find((x) => x.value === e) || ESTADOS[0]

const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayYmd = () => { const d = new Date(); return ymd(d.getFullYear(), d.getMonth(), d.getDate()) }
function diaLargo(f) { const [y, m, d] = f.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${DOWL[dt.getDay()]} ${d} de ${MESES[m - 1]}` }

export default function Redes() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [items, setItems] = useState([])
  const [metrica, setMetrica] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editConsultas, setEditConsultas] = useState(false)
  const [consultasVal, setConsultasVal] = useState('')

  const mStart = ymd(year, month, 1)
  const mEnd = ymd(year, month, new Date(year, month + 1, 0).getDate())
  const mesKey = `${year}-${pad(month + 1)}`

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('contenidos').select('*').gte('fecha', mStart).lte('fecha', mEnd).order('fecha'),
      supabase.from('redes_metricas').select('*').eq('mes', mesKey).maybeSingle(),
    ])
    setItems(c || [])
    setMetrica(m || null)
    setLoading(false)
  }
  useEffect(() => { load() }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemsDe = (f) => items.filter((c) => c.fecha === f)

  function prevMes() { setSel(null); if (month === 0) { setYear(year - 1); setMonth(11) } else setMonth(month - 1) }
  function nextMes() { setSel(null); if (month === 11) { setYear(year + 1); setMonth(0) } else setMonth(month + 1) }
  function hoyMes() { setSel(null); setYear(now.getFullYear()); setMonth(now.getMonth()) }

  function nuevo(fecha) { setForm({ titulo: '', tipo: 'publicacion', estado: 'idea', fecha: fecha || todayYmd(), nota: '' }) }
  function editar(c) { setForm({ id: c.id, titulo: c.titulo, tipo: c.tipo, estado: c.estado, fecha: c.fecha, nota: c.nota || '' }) }

  async function guardar() {
    if (!form.titulo.trim()) return
    setSaving(true)
    const payload = { titulo: form.titulo.trim(), tipo: form.tipo, estado: form.estado, fecha: form.fecha, nota: (form.nota || '').trim() || null }
    const { error } = form.id
      ? await supabase.from('contenidos').update(payload).eq('id', form.id)
      : await supabase.from('contenidos').insert(payload)
    setSaving(false)
    if (error) return
    setSel(form.fecha)
    setForm(null)
    await load()
  }

  async function borrar() {
    if (!form?.id) return
    setSaving(true)
    await supabase.from('contenidos').delete().eq('id', form.id)
    setSaving(false)
    setForm(null)
    await load()
  }

  async function guardarConsultas() {
    const n = Number(consultasVal || 0)
    await supabase.from('redes_metricas').upsert({ mes: mesKey, consultas: n, updated_at: new Date().toISOString() })
    setEditConsultas(false)
    await load()
  }

  // KPIs del mes
  const subidos = items.filter((c) => c.estado === 'subido').length
  const historias = items.filter((c) => c.tipo === 'historia' || c.tipo === 'ambas').length
  const publicaciones = items.filter((c) => c.tipo === 'publicacion' || c.tipo === 'ambas').length
  const ideas = items.filter((c) => c.estado === 'idea').length
  const consultas = metrica?.consultas || 0

  // celdas del mes (lunes primero)
  const primerDow = (new Date(year, month, 1).getDay() + 6) % 7
  const diasMes = new Date(year, month + 1, 0).getDate()
  const celdas = []
  for (let i = 0; i < primerDow; i++) celdas.push(null)
  for (let d = 1; d <= diasMes; d++) celdas.push(d)
  while (celdas.length % 7 !== 0) celdas.push(null)
  const hoy = todayYmd()

  return (
    <div className="agenda">
      <div className="section-head">
        <h1 className="section-title">Redes</h1>
        <button className="btn-primary" onClick={() => nuevo(sel)}>+ Contenido</button>
      </div>
      <p className="cal-sub">Calendario de contenido · ideas, historias y publicaciones · privado (solo admins)</p>

      <div className="kpi-grid">
        <div className="kpi"><span className="kpi-num">{subidos}</span><span className="kpi-lbl">subidos este mes</span></div>
        <div className="kpi"><span className="kpi-num">{historias}</span><span className="kpi-lbl">historias</span></div>
        <div className="kpi"><span className="kpi-num">{publicaciones}</span><span className="kpi-lbl">publicaciones</span></div>
        <div className="kpi"><span className="kpi-num">{ideas}</span><span className="kpi-lbl">ideas pendientes</span></div>
        <div className="kpi kpi-edit">
          {editConsultas ? (
            <>
              <input className="kpi-in" type="number" inputMode="numeric" value={consultasVal} autoFocus
                onChange={(e) => setConsultasVal(e.target.value)} />
              <span className="kpi-acc">
                <button className="confirm-si" onClick={guardarConsultas}>OK</button>
                <button className="confirm-no" onClick={() => setEditConsultas(false)}>✕</button>
              </span>
            </>
          ) : (
            <>
              <span className="kpi-num">{consultas}</span>
              <span className="kpi-lbl">consultas p/ entrenar</span>
              <button className="kpi-editbtn" onClick={() => { setConsultasVal(String(consultas)); setEditConsultas(true) }}>editar</button>
            </>
          )}
        </div>
      </div>

      {form && (
        <div className="agenda-form">
          <span className="plan-copiar-tit">{form.id ? 'Editar contenido' : 'Nuevo contenido'}</span>
          <div className="agenda-form-row">
            <input className="agenda-in" value={form.titulo} autoFocus
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Idea / contenido (ej: Tip de técnica en sentadilla)" />
          </div>
          <div className="agenda-form-row two">
            <label>Va a
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label>Estado
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <div className="agenda-form-row two">
            <label>Día
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </label>
          </div>
          <div className="agenda-form-row">
            <input className="agenda-in" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} placeholder="Nota / guión / caption (opcional)" />
          </div>
          <div className="form-actions">
            {form.id ? <button type="button" className="btn-del-text" onClick={borrar} disabled={saving}>Borrar</button> : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={guardar} disabled={saving || !form.titulo.trim()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="agenda-nav">
        <button className="btn-ghost btn-mini" onClick={prevMes}>←</button>
        <button className="agenda-mes" onClick={hoyMes} title="Ir a hoy">{MESES[month]} {year}</button>
        <button className="btn-ghost btn-mini" onClick={nextMes}>→</button>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          <div className="agenda-grid agenda-dow">
            {DOW.map((d) => <div key={d} className="agenda-dow-c">{d}</div>)}
          </div>
          <div className="agenda-grid">
            {celdas.map((d, i) => {
              if (!d) return <div key={i} className="agenda-cell empty" />
              const f = ymd(year, month, d)
              const evs = itemsDe(f)
              return (
                <button key={i} className={`agenda-cell ${f === hoy ? 'hoy' : ''} ${sel === f ? 'sel' : ''}`} onClick={() => setSel(f)}>
                  <span className="agenda-daynum">{d}</span>
                  <span className="agenda-dots">
                    {evs.slice(0, 6).map((e) => (
                      <span key={e.id} className="agenda-dot" style={{ background: tinfo(e.tipo).bg, opacity: e.estado === 'subido' ? 1 : 0.5 }} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="agenda-legend">
            {TIPOS.map((t) => (
              <span key={t.value} className="agenda-leg"><span className="agenda-dot" style={{ background: t.bg }} /> {t.label}</span>
            ))}
            <span className="agenda-leg"><span className="agenda-dot" style={{ background: '#8b94a6', opacity: 0.5 }} /> sin subir</span>
          </div>

          {sel && (
            <div className="agenda-day">
              <div className="agenda-day-head">
                <strong>{diaLargo(sel)}</strong>
                <button className="btn-ghost btn-mini" onClick={() => nuevo(sel)}>+ Agregar acá</button>
              </div>
              {itemsDe(sel).length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>Nada este día. Cargá una idea o el contenido del día.</p>
              ) : (
                itemsDe(sel).map((c) => (
                  <button key={c.id} className="agenda-ev" style={{ borderLeftColor: tinfo(c.tipo).bg }} onClick={() => editar(c)}>
                    <span className="agenda-ev-tit">{c.titulo}</span>
                    <span className="agenda-ev-meta">{tinfo(c.tipo).label} · {einfo(c.estado).label}</span>
                    {c.nota ? <span className="agenda-ev-nota">{c.nota}</span> : null}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
