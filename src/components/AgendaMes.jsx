import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DOWL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const TIPOS = [
  { value: 'feriado', label: 'Feriado', bg: '#c15b3f' },
  { value: 'campamento', label: 'Campamento', bg: '#1f8f63' },
  { value: 'vacaciones', label: 'Vacaciones', bg: '#2f6fb0' },
  { value: 'partido', label: 'Partido', bg: '#6d4bd0' },
  { value: 'evento', label: 'Evento importante', bg: '#b3557a' },
  { value: 'otro', label: 'Otro', bg: '#5b6675' },
]
const tinfo = (t) => TIPOS.find((x) => x.value === t) || TIPOS[5]

// Feriados nacionales de Argentina 2026 (los movibles ya calculados).
// Carnaval, Viernes Santo, Güemes y Soberanía son trasladables → conviene chequearlos.
const FERIADOS_2026 = [
  { f: '2026-01-01', t: 'Año Nuevo' },
  { f: '2026-02-16', t: 'Carnaval' },
  { f: '2026-02-17', t: 'Carnaval' },
  { f: '2026-03-24', t: 'Día de la Memoria' },
  { f: '2026-04-02', t: 'Día del Veterano (Malvinas)' },
  { f: '2026-04-03', t: 'Viernes Santo' },
  { f: '2026-05-01', t: 'Día del Trabajador' },
  { f: '2026-05-25', t: 'Revolución de Mayo' },
  { f: '2026-06-17', t: 'Paso a la Inmortalidad de Güemes' },
  { f: '2026-06-20', t: 'Día de la Bandera' },
  { f: '2026-07-09', t: 'Día de la Independencia' },
  { f: '2026-08-17', t: 'Paso a la Inmortalidad de San Martín' },
  { f: '2026-10-12', t: 'Día del Respeto a la Diversidad Cultural' },
  { f: '2026-11-20', t: 'Día de la Soberanía Nacional' },
  { f: '2026-12-08', t: 'Inmaculada Concepción de María' },
  { f: '2026-12-25', t: 'Navidad' },
]

const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}` // m 0-indexed
const todayYmd = () => { const d = new Date(); return ymd(d.getFullYear(), d.getMonth(), d.getDate()) }
function diaLargo(f) { const [y, m, d] = f.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${DOWL[dt.getDay()]} ${d} de ${MESES[m - 1]}` }
function cortita(f) { const [, m, d] = f.split('-').map(Number); return `${d}/${m}` }

export default function AgendaMes() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [eventos, setEventos] = useState([])
  const [profes, setProfes] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null) // ymd string | null
  const [form, setForm] = useState(null) // evento agregando/editando | null
  const [saving, setSaving] = useState(false)
  const [cargandoFer, setCargandoFer] = useState(false)
  const [ferMsg, setFerMsg] = useState('')

  const mStart = ymd(year, month, 1)
  const mEnd = ymd(year, month, new Date(year, month + 1, 0).getDate())

  async function load() {
    setLoading(true)
    const [{ data: ev }, { data: pr }] = await Promise.all([
      supabase.from('eventos').select('*')
        .lte('fecha', mEnd)
        .or(`fecha_fin.gte.${mStart},fecha.gte.${mStart}`)
        .order('fecha'),
      supabase.from('profes_publico').select('id, nombre').order('id'),
    ])
    setEventos(ev || [])
    setProfes(pr || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  const nombreProfe = (id) => profes.find((p) => p.id === id)?.nombre || ''
  const eventosDe = (f) => eventos.filter((e) => e.fecha <= f && (e.fecha_fin || e.fecha) >= f)

  function prevMes() { setSel(null); if (month === 0) { setYear(year - 1); setMonth(11) } else setMonth(month - 1) }
  function nextMes() { setSel(null); if (month === 11) { setYear(year + 1); setMonth(0) } else setMonth(month + 1) }
  function hoyMes() { setSel(null); setYear(now.getFullYear()); setMonth(now.getMonth()) }

  function nuevo(fecha) { setForm({ titulo: '', tipo: 'evento', fecha: fecha || todayYmd(), fecha_fin: '', profe_id: '', nota: '' }) }
  function editar(e) { setForm({ id: e.id, titulo: e.titulo, tipo: e.tipo, fecha: e.fecha, fecha_fin: e.fecha_fin || '', profe_id: e.profe_id ? String(e.profe_id) : '', nota: e.nota || '' }) }

  async function guardar() {
    if (!form.titulo.trim()) return
    setSaving(true)
    const payload = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      fecha: form.fecha,
      fecha_fin: form.fecha_fin && form.fecha_fin >= form.fecha ? form.fecha_fin : null,
      profe_id: form.profe_id ? Number(form.profe_id) : null,
      nota: (form.nota || '').trim() || null,
    }
    const { error } = form.id
      ? await supabase.from('eventos').update(payload).eq('id', form.id)
      : await supabase.from('eventos').insert(payload)
    setSaving(false)
    if (error) return
    setSel(form.fecha)
    setForm(null)
    await load()
  }

  async function cargarFeriados() {
    setCargandoFer(true)
    setFerMsg('')
    const { data: exist } = await supabase.from('eventos').select('fecha')
      .eq('tipo', 'feriado').gte('fecha', '2026-01-01').lte('fecha', '2026-12-31')
    const ya = new Set((exist || []).map((e) => e.fecha))
    const faltan = FERIADOS_2026.filter((x) => !ya.has(x.f))
      .map((x) => ({ titulo: x.t, tipo: 'feriado', fecha: x.f, fecha_fin: null, profe_id: null, nota: null }))
    if (!faltan.length) { setCargandoFer(false); setFerMsg('Los feriados 2026 ya estaban cargados.'); return }
    const { error } = await supabase.from('eventos').insert(faltan)
    setCargandoFer(false)
    if (error) { setFerMsg('No se pudieron cargar los feriados.'); return }
    setFerMsg(`Cargué ${faltan.length} feriado${faltan.length === 1 ? '' : 's'} 2026. Tocá cada uno para asignar quién trabaja.`)
    await load()
  }

  async function borrar() {
    if (!form?.id) return
    setSaving(true)
    await supabase.from('eventos').delete().eq('id', form.id)
    setSaving(false)
    setForm(null)
    await load()
  }

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
        <h1 className="section-title">Agenda</h1>
        <div className="section-head-actions">
          <button className="btn-ghost" onClick={cargarFeriados} disabled={cargandoFer}>
            {cargandoFer ? 'Cargando…' : '🇦🇷 Feriados 2026'}
          </button>
          <button className="btn-primary" onClick={() => nuevo(sel)}>+ Agregar</button>
        </div>
      </div>
      <p className="cal-sub">Feriados, campamentos, vacaciones, partidos y eventos del staff · privado (solo admins)</p>
      {ferMsg && <p className="plan-ok" style={{ marginTop: 0 }}>{ferMsg}</p>}

      {form && (
        <div className="agenda-form">
          <span className="plan-copiar-tit">{form.id ? 'Editar evento' : 'Nuevo evento'}</span>
          <div className="agenda-form-row">
            <input className="agenda-in" value={form.titulo} autoFocus
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Título (ej: Feriado, Campamento río, Partido de Gastón)" />
          </div>
          <div className="agenda-form-row two">
            <label>Tipo
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label>A quién le toca
              <select value={form.profe_id} onChange={(e) => setForm({ ...form, profe_id: e.target.value })}>
                <option value="">— nadie —</option>
                {profes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
          </div>
          <div className="agenda-form-row two">
            <label>Desde
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </label>
            <label>Hasta (opcional)
              <input type="date" value={form.fecha_fin} min={form.fecha} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
            </label>
          </div>
          <div className="agenda-form-row">
            <input className="agenda-in" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} placeholder="Nota (opcional)" />
          </div>
          <div className="form-actions">
            {form.id
              ? <button type="button" className="btn-del-text" onClick={borrar} disabled={saving}>Borrar</button>
              : <span />}
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
              const evs = eventosDe(f)
              return (
                <button key={i} className={`agenda-cell ${f === hoy ? 'hoy' : ''} ${sel === f ? 'sel' : ''}`} onClick={() => setSel(f)}>
                  <span className="agenda-daynum">{d}</span>
                  <span className="agenda-dots">
                    {evs.slice(0, 4).map((e) => <span key={e.id} className="agenda-dot" style={{ background: tinfo(e.tipo).bg }} />)}
                    {evs.length > 4 && <span className="agenda-more">+{evs.length - 4}</span>}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="agenda-legend">
            {TIPOS.map((t) => (
              <span key={t.value} className="agenda-leg"><span className="agenda-dot" style={{ background: t.bg }} /> {t.label}</span>
            ))}
          </div>

          {sel && (
            <div className="agenda-day">
              <div className="agenda-day-head">
                <strong>{diaLargo(sel)}</strong>
                <button className="btn-ghost btn-mini" onClick={() => nuevo(sel)}>+ Agregar acá</button>
              </div>
              {eventosDe(sel).length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>Nada este día.</p>
              ) : (
                eventosDe(sel).map((e) => (
                  <button key={e.id} className="agenda-ev" style={{ borderLeftColor: tinfo(e.tipo).bg }} onClick={() => editar(e)}>
                    <span className="agenda-ev-tit">{e.titulo}</span>
                    <span className="agenda-ev-meta">
                      {tinfo(e.tipo).label}
                      {e.profe_id ? ` · ${nombreProfe(e.profe_id)}` : ''}
                      {e.fecha_fin && e.fecha_fin !== e.fecha ? ` · ${cortita(e.fecha)}→${cortita(e.fecha_fin)}` : ''}
                    </span>
                    {e.nota ? <span className="agenda-ev-nota">{e.nota}</span> : null}
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
