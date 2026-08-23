import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import { hoyISO } from '../lib/domain'

const CATS = [
  { v: 'lesiones', l: 'Lesiones', c: '#ef4444' },
  { v: 'partidos', l: 'Partidos', c: '#0891b2' },
  { v: 'planificacion', l: 'Planificación', c: '#c6f24e' },
  { v: 'otro', l: 'Otro', c: '#8b93a1' },
]
const catInfo = (v) => CATS.find((c) => c.v === v) || CATS[3]

export default function NMArchivos({ onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [form, setForm] = useState(null) // { categoria, titulo, nota, fecha, file }
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nm_archivos').select('*').order('fecha', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function subir(e) {
    e.preventDefault()
    setError('')
    if (!form.file) { setError('Elegí un archivo.'); return }
    setSubiendo(true)
    const limpio = form.file.name.replace(/[^\w.\-]+/g, '_')
    const path = `${Date.now()}_${limpio}`
    const up = await supabase.storage.from('nm-archivos').upload(path, form.file)
    if (up.error) { setSubiendo(false); setError('No se pudo subir: ' + up.error.message); return }
    const payload = {
      categoria: form.categoria, titulo: form.titulo.trim() || form.file.name,
      path, fecha: form.fecha || hoyISO(), nota: form.nota.trim() || null,
    }
    const { data, error: err } = await supabase.from('nm_archivos').insert(payload).select().single()
    setSubiendo(false)
    if (err) { setError('No se pudo guardar: ' + err.message); return }
    setItems((l) => [data, ...l].sort((a, b) => ((a.fecha || '') < (b.fecha || '') ? 1 : -1)))
    setForm(null)
  }

  async function ver(a) {
    const { data, error: err } = await supabase.storage.from('nm-archivos').createSignedUrl(a.path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else alert('No se pudo abrir: ' + (err?.message || ''))
  }
  async function borrar(a) {
    if (a.path) await supabase.storage.from('nm-archivos').remove([a.path])
    await supabase.from('nm_archivos').delete().eq('id', a.id)
    setItems((l) => l.filter((x) => x.id !== a.id))
  }

  const filtrados = filtro === 'todos' ? items : items.filter((i) => i.categoria === filtro)

  return (
    <div className="nm-arch nm-scope">
      <div className="section-head">
        <button className="btn-back" onClick={onBack}>← NM</button>
        {!form && <button className="btn-primary" onClick={() => setForm({ categoria: 'lesiones', titulo: '', nota: '', fecha: hoyISO(), file: null })}>+ Subir</button>}
      </div>
      <h1 className="section-title">Archivos</h1>
      <p className="cal-sub">Reportes de lesiones, partidos, planificación macro. Privado, solo tuyo.</p>

      {form && (
        <form className="form" onSubmit={subir}>
          <label className="field">
            <span>Archivo</span>
            <input type="file" onChange={(e) => {
              const f = e.target.files?.[0] || null
              setForm((s) => ({ ...s, file: f, titulo: s.titulo || (f ? f.name.replace(/\.[^.]+$/, '') : '') }))
            }} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Categoría</span>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </label>
            <label className="field"><span>Fecha</span><input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label>
          </div>
          <label className="field"><span>Título</span><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Resonancia rodilla — Juan" /></label>
          <label className="field"><span>Nota (opcional)</span><input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></label>
          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={subiendo}>{subiendo ? 'Subiendo…' : 'Subir'}</button>
          </div>
        </form>
      )}

      <div className="nm-cmp-metricas">
        <button className={`nm-chip ${filtro === 'todos' ? 'on' : ''}`} onClick={() => setFiltro('todos')}>Todos</button>
        {CATS.map((c) => (
          <button key={c.v} className={`nm-chip ${filtro === c.v ? 'on' : ''}`} onClick={() => setFiltro(c.v)}>{c.l}</button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="muted">{items.length === 0 ? 'Todavía no subiste archivos. Tocá "+ Subir".' : 'No hay archivos en esa categoría.'}</p>
      ) : (
        <ul className="nm-arch-list">
          {filtrados.map((a) => {
            const ci = catInfo(a.categoria)
            return (
              <li key={a.id} className="nm-arch-row" style={{ '--c': ci.c }}>
                <div className="nm-arch-info" onClick={() => ver(a)}>
                  <span className="nm-arch-cat">{ci.l}</span>
                  <span className="nm-arch-tit">{a.titulo}</span>
                  <span className="nm-arch-sub">{a.fecha ? formatFecha(a.fecha) : ''}{a.nota ? ` · ${a.nota}` : ''}</span>
                </div>
                <button className="nm-arch-ver" onClick={() => ver(a)}>Ver</button>
                <button className="pago-del" onClick={() => borrar(a)} aria-label="Borrar">✕</button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
