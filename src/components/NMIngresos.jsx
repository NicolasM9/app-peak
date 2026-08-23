import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { hoyISO } from '../lib/domain'

const CONCEPTOS = ['Hacoaj', 'Online', 'Otro']
const COLOR = { Hacoaj: '#c6f24e', Online: '#0891b2', Otro: '#8b93a1' }

export default function NMIngresos({ onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null) // { mes, concepto, monto, nota }

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nm_ingresos').select('*').order('mes', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function guardar(e) {
    e.preventDefault()
    if (!form.monto) return
    const payload = { mes: form.mes || null, concepto: form.concepto || 'Otro', monto: Number(form.monto), nota: form.nota.trim() || null }
    const { data } = await supabase.from('nm_ingresos').insert(payload).select().single()
    if (data) setItems((l) => [data, ...l].sort((a, b) => ((a.mes || '') < (b.mes || '') ? 1 : -1)))
    setForm(null)
  }
  async function borrar(id) {
    await supabase.from('nm_ingresos').delete().eq('id', id)
    setItems((l) => l.filter((x) => x.id !== id))
  }

  const mesActual = hoyISO().slice(0, 7)
  const anioActual = mesActual.slice(0, 4)
  const totalMes = items.filter((i) => i.mes === mesActual).reduce((s, i) => s + Number(i.monto || 0), 0)
  const totalAnio = items.filter((i) => (i.mes || '').startsWith(anioActual)).reduce((s, i) => s + Number(i.monto || 0), 0)
  const porConcepto = {}
  items.filter((i) => (i.mes || '').startsWith(anioActual)).forEach((i) => {
    const c = i.concepto || 'Otro'
    porConcepto[c] = (porConcepto[c] || 0) + Number(i.monto || 0)
  })

  return (
    <div className="nm-ing nm-scope">
      <div className="section-head">
        <button className="btn-back" onClick={onBack}>← NM</button>
        {!form && <button className="btn-primary" onClick={() => setForm({ mes: mesActual, concepto: 'Hacoaj', monto: '', nota: '' })}>+ Registrar</button>}
      </div>
      <h1 className="section-title">Hacoaj y sueldo</h1>
      <p className="cal-sub">Tus ingresos personales. Aparte de Peak, no suman a ningún número del gimnasio.</p>

      <div className="nm-ing-kpis">
        <div className="nm-ing-kpi"><span className="nm-ing-kpi-lbl">Este mes</span><span className="nm-ing-kpi-val">{formatARS(totalMes)}</span></div>
        <div className="nm-ing-kpi"><span className="nm-ing-kpi-lbl">Este año ({anioActual})</span><span className="nm-ing-kpi-val">{formatARS(totalAnio)}</span></div>
      </div>

      {Object.keys(porConcepto).length > 0 && (
        <div className="nm-ing-conceptos">
          {Object.entries(porConcepto).sort((a, b) => b[1] - a[1]).map(([c, m]) => (
            <span key={c} className="nm-ing-concepto">
              <span className="nm-ing-dot" style={{ background: COLOR[c] || '#8b93a1' }} />
              {c} <b>{formatARS(m)}</b>
            </span>
          ))}
        </div>
      )}

      {form && (
        <form className="form" onSubmit={guardar}>
          <div className="field-row">
            <label className="field"><span>Mes</span><input type="month" value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })} /></label>
            <label className="field"><span>Monto</span><input type="number" inputMode="numeric" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} autoFocus /></label>
          </div>
          <label className="field">
            <span>Concepto</span>
            <input list="nm-conceptos" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
            <datalist id="nm-conceptos">{CONCEPTOS.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="field"><span>Nota (opcional)</span><input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></label>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="muted">Todavía no registraste ingresos. Tocá "+ Registrar".</p>
      ) : (
        <ul className="pago-list">
          {items.map((i) => (
            <li key={i.id} className="pago-row">
              <div className="pago-info">
                <span className="pago-venc">
                  <span className="nm-ing-dot" style={{ background: COLOR[i.concepto] || '#8b93a1' }} /> {i.concepto || 'Otro'}
                </span>
                <span className="pago-sub">{i.mes || 'Sin mes'}{i.nota ? ` · ${i.nota}` : ''}</span>
              </div>
              <div className="pago-right"><span className="pago-monto">{formatARS(i.monto)}</span></div>
              <button className="pago-del" onClick={() => borrar(i.id)} aria-label="Borrar">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
