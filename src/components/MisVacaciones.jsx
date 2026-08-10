import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import { hoyISO } from '../lib/domain'

export default function MisVacaciones({ profeId }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase
      .from('vacaciones')
      .select('id, inicio, fin, exceso')
      .eq('profe_id', profeId)
      .order('inicio', { ascending: false })
    setLista(data || [])
    setLoading(false)
  }
  useEffect(() => {
    setLoading(true)
    load()
  }, [profeId])

  async function agregar(e) {
    e.preventDefault()
    setError('')
    if (!inicio || !fin) { setError('Poné desde y hasta.'); return }
    if (fin < inicio) { setError('El "hasta" no puede ser antes del "desde".'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('vacaciones')
      .insert({ profe_id: profeId, inicio, fin })
      .select('id, inicio, fin, exceso')
      .single()
    setSaving(false)
    if (err) { setError('No se pudo guardar: ' + err.message); return }
    setLista((l) => [data, ...l].sort((a, b) => (a.inicio < b.inicio ? 1 : -1)))
    setInicio('')
    setFin('')
    setShowForm(false)
  }

  async function borrar(id) {
    await supabase.from('vacaciones').delete().eq('id', id)
    setLista((l) => l.filter((v) => v.id !== id))
  }

  const hoy = hoyISO()

  return (
    <div className="pk-card" style={{ marginTop: 14 }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🏖️ Mis vacaciones</span>
        {!showForm && <button className="btn-ghost" onClick={() => setShowForm(true)}>+ Agregar</button>}
      </div>

      {showForm && (
        <form onSubmit={agregar} style={{ margin: '10px 0 4px' }}>
          <div className="field-row">
            <label className="field"><span>Desde</span><input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
            <label className="field"><span>Hasta</span><input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></label>
          </div>
          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => { setShowForm(false); setError('') }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted" style={{ margin: 0 }}>Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>No tenés vacaciones cargadas. Tocá "+ Agregar".</p>
      ) : (
        lista.map((v) => (
          <div key={v.id} className="mini-row">
            <span>
              {formatFecha(v.inicio)} → {formatFecha(v.fin)}
              {v.fin < hoy && <span className="muted"> (pasadas)</span>}
              {v.exceso ? <span className="muted"> · {v.exceso}</span> : null}
            </span>
            <button className="pago-del" aria-label="Borrar" onClick={() => borrar(v.id)}>✕</button>
          </div>
        ))
      )}
    </div>
  )
}
