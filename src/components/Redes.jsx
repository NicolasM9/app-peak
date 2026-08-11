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
const PASOS = [
  { key: 'grabar', label: 'Grabar' },
  { key: 'editar', label: 'Editar' },
  { key: 'copy', label: 'Copy' },
  { key: 'subir', label: 'Subir' },
]
const tinfo = (t) => TIPOS.find((x) => x.value === t) || TIPOS[1]

const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayYmd = () => { const d = new Date(); return ymd(d.getFullYear(), d.getMonth(), d.getDate()) }
function diaLargo(f) { const [y, m, d] = f.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${DOWL[dt.getDay()]} ${d} de ${MESES[m - 1]}` }
const diasEntre = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000)

export default function Redes() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [items, setItems] = useState([])
  const [backlog, setBacklog] = useState([])
  const [metrica, setMetrica] = useState(null)
  const [altasMes, setAltasMes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [edit, setEdit] = useState(null) // 'consultas' | 'meta' | null
  const [editVal, setEditVal] = useState('')

  const mStart = ymd(year, month, 1)
  const mEnd = ymd(year, month, new Date(year, month + 1, 0).getDate())
  const mesKey = `${year}-${pad(month + 1)}`

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: bk }, { data: m }, { data: al }] = await Promise.all([
      supabase.from('contenidos').select('*').gte('fecha', mStart).lte('fecha', mEnd).order('fecha'),
      supabase.from('contenidos').select('*').is('fecha', null).order('created_at', { ascending: false }),
      supabase.from('redes_metricas').select('*').eq('mes', mesKey).maybeSingle(),
      supabase.from('alumnos').select('id').gte('fecha_alta', mStart).lte('fecha_alta', mEnd),
    ])
    setItems(c || [])
    setBacklog(bk || [])
    setMetrica(m || null)
    setAltasMes((al || []).length)
    setLoading(false)
  }
  useEffect(() => { load() }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemsDe = (f) => items.filter((c) => c.fecha === f)

  function prevMes() { setSel(null); if (month === 0) { setYear(year - 1); setMonth(11) } else setMonth(month - 1) }
  function nextMes() { setSel(null); if (month === 11) { setYear(year + 1); setMonth(0) } else setMonth(month + 1) }
  function hoyMes() { setSel(null); setYear(now.getFullYear()); setMonth(now.getMonth()) }

  function nuevo(fecha) { setForm({ titulo: '', tipo: 'publicacion', fecha: fecha || todayYmd(), nota: '' }) }
  function nuevaIdea() { setForm({ titulo: '', tipo: 'publicacion', fecha: '', nota: '' }) }
  function editar(c) { setForm({ id: c.id, titulo: c.titulo, tipo: c.tipo, fecha: c.fecha || '', nota: c.nota || '' }) }

  async function guardar() {
    if (!form.titulo.trim()) return
    setSaving(true)
    const payload = { titulo: form.titulo.trim(), tipo: form.tipo, fecha: form.fecha || null, nota: (form.nota || '').trim() || null }
    const { error } = form.id
      ? await supabase.from('contenidos').update(payload).eq('id', form.id)
      : await supabase.from('contenidos').insert(payload)
    setSaving(false)
    if (error) return
    if (form.fecha) setSel(form.fecha)
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

  async function togglePaso(c, key) {
    const pasos = { ...(c.pasos || {}), [key]: !(c.pasos || {})[key] }
    await supabase.from('contenidos').update({ pasos }).eq('id', c.id)
    await load()
  }
  async function programar(c, fecha) {
    if (!fecha) return
    await supabase.from('contenidos').update({ fecha }).eq('id', c.id)
    await load()
  }
  async function borrarItem(id) {
    await supabase.from('contenidos').delete().eq('id', id)
    await load()
  }

  async function guardarMetrica(campo) {
    const n = Number(editVal || 0)
    const base = { mes: mesKey, consultas: metrica?.consultas || 0, meta: metrica?.meta || 0, updated_at: new Date().toISOString() }
    base[campo] = n
    await supabase.from('redes_metricas').upsert(base)
    setEdit(null)
    await load()
  }

  // KPIs del mes
  const subidos = items.filter((c) => c.pasos?.subir).length
  const historias = items.filter((c) => c.tipo === 'historia' || c.tipo === 'ambas').length
  const publicaciones = items.filter((c) => c.tipo === 'publicacion' || c.tipo === 'ambas').length
  const consultas = metrica?.consultas || 0
  const meta = metrica?.meta || 0
  const conversion = consultas > 0 ? Math.round((altasMes / consultas) * 100) : null
  const metaPct = meta > 0 ? Math.min(100, Math.round((subidos / meta) * 100)) : 0
  const esMesActual = year === now.getFullYear() && month === now.getMonth()
  const subidasFechas = items.filter((c) => c.pasos?.subir).map((c) => c.fecha).sort()
  const ultSubida = subidasFechas.length ? subidasFechas[subidasFechas.length - 1] : null
  const diasSinPostear = esMesActual && ultSubida ? diasEntre(ultSubida, todayYmd()) : null

  // celdas del mes (lunes primero)
  const primerDow = (new Date(year, month, 1).getDay() + 6) % 7
  const diasMes = new Date(year, month + 1, 0).getDate()
  const celdas = []
  for (let i = 0; i < primerDow; i++) celdas.push(null)
  for (let d = 1; d <= diasMes; d++) celdas.push(d)
  while (celdas.length % 7 !== 0) celdas.push(null)
  const hoy = todayYmd()

  const kpiEdit = (campo, valor, label) => (
    <div className="kpi kpi-edit">
      {edit === campo ? (
        <>
          <input className="kpi-in" type="number" inputMode="numeric" value={editVal} autoFocus onChange={(e) => setEditVal(e.target.value)} />
          <span className="kpi-acc">
            <button className="confirm-si" onClick={() => guardarMetrica(campo)}>OK</button>
            <button className="confirm-no" onClick={() => setEdit(null)}>✕</button>
          </span>
        </>
      ) : (
        <>
          <span className="kpi-num">{valor}</span>
          <span className="kpi-lbl">{label}</span>
          <button className="kpi-editbtn" onClick={() => { setEditVal(String(valor)); setEdit(campo) }}>editar</button>
        </>
      )}
    </div>
  )

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
        {kpiEdit('consultas', consultas, 'consultas p/ entrenar')}
        <div className="kpi"><span className="kpi-num">{altasMes}</span><span className="kpi-lbl">altas del mes</span></div>
        <div className="kpi"><span className="kpi-num">{conversion == null ? '—' : conversion + '%'}</span><span className="kpi-lbl">conversión (altas/consultas)</span></div>
      </div>

      <div className="meta-box">
        <div className="meta-head">
          <span>Meta del mes: {meta > 0 ? <b>{subidos}/{meta} subidos</b> : <span className="muted">sin meta</span>}</span>
          {edit === 'meta' ? (
            <span className="ht-base-form">
              <input className="kpi-in" style={{ fontSize: 15, width: 70 }} type="number" inputMode="numeric" value={editVal} autoFocus onChange={(e) => setEditVal(e.target.value)} />
              <button className="confirm-si" onClick={() => guardarMetrica('meta')}>OK</button>
              <button className="confirm-no" onClick={() => setEdit(null)}>✕</button>
            </span>
          ) : (
            <button className="btn-link" onClick={() => { setEditVal(String(meta)); setEdit('meta') }}>editar meta</button>
          )}
        </div>
        {meta > 0 && <div className="meta-bar"><span className="meta-fill" style={{ width: metaPct + '%' }} /></div>}
        {esMesActual && (
          <span className="meta-nota">
            {ultSubida ? (diasSinPostear === 0 ? 'Subiste algo hoy 👍' : `Hace ${diasSinPostear} día${diasSinPostear === 1 ? '' : 's'} que no subís`) : 'No subiste nada este mes todavía'}
          </span>
        )}
      </div>

      {form && (
        <div className="agenda-form">
          <span className="plan-copiar-tit">{form.id ? 'Editar contenido' : (form.fecha ? 'Nuevo contenido' : 'Nueva idea suelta')}</span>
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
            <label>Día (vacío = idea suelta)
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
                      <span key={e.id} className="agenda-dot" style={{ background: tinfo(e.tipo).bg, opacity: e.pasos?.subir ? 1 : 0.45 }} />
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
            <span className="agenda-leg"><span className="agenda-dot" style={{ background: '#8b94a6', opacity: 0.45 }} /> sin subir</span>
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
                  <div key={c.id} className="cont-item" style={{ borderLeftColor: tinfo(c.tipo).bg }}>
                    <button className="cont-item-main" onClick={() => editar(c)}>
                      <span className="agenda-ev-tit">{c.titulo}</span>
                      <span className="agenda-ev-meta">{tinfo(c.tipo).label}{c.nota ? ` · ${c.nota}` : ''}</span>
                    </button>
                    <div className="cont-pasos">
                      {PASOS.map((p) => (
                        <button key={p.key} className={`cont-paso ${c.pasos?.[p.key] ? 'on' : ''}`} onClick={() => togglePaso(c, p.key)}>
                          {c.pasos?.[p.key] ? '✓ ' : ''}{p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="section-subhead" style={{ marginTop: 22 }}>
            <h2>💡 Ideas sueltas</h2>
            <button className="btn-ghost btn-mini" onClick={nuevaIdea}>+ Idea</button>
          </div>
          {backlog.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Sin ideas sueltas. Tirá ideas acá y después les ponés fecha.</p>
          ) : (
            <div className="backlog-list">
              {backlog.map((c) => (
                <div key={c.id} className="backlog-row" style={{ borderLeftColor: tinfo(c.tipo).bg }}>
                  <button className="backlog-main" onClick={() => editar(c)}>
                    <span className="agenda-ev-tit">{c.titulo}</span>
                    <span className="agenda-ev-meta">{tinfo(c.tipo).label}{c.nota ? ` · ${c.nota}` : ''}</span>
                  </button>
                  <input type="date" className="backlog-date" title="Programar" onChange={(e) => programar(c, e.target.value)} />
                  <button className="agenda-ev-nota backlog-del" title="Borrar" onClick={() => borrarItem(c.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
