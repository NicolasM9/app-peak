import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DIAS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
]
const ORDEN = Object.fromEntries(DIAS.map((d, i) => [d.key, i]))
const fmtHora = (t) => (t || '').slice(0, 5).replace(/^0/, '')
function mas1h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const tot = (h * 60 + m + 60) % (24 * 60)
  return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}:00`
}

export default function MisPersonalizados({ profe }) {
  const [sesiones, setSesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [dias, setDias] = useState([])
  const [hora, setHora] = useState('18:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase
      .from('sesiones')
      .select('id, titulo, dia, hora_inicio')
      .eq('tipo', 'personalizado')
      .eq('profe_id', profe.id)
    setSesiones(data || [])
    setLoading(false)
  }
  useEffect(() => {
    setLoading(true)
    load()
  }, [profe.id])

  function toggleDia(k) {
    setDias((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]))
  }

  async function agregar(e) {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) { setError('Poné el nombre.'); return }
    if (dias.length === 0) { setError('Elegí al menos un día.'); return }
    if (!hora) { setError('Poné el horario.'); return }
    setSaving(true)
    const rows = dias.map((d) => ({
      dia: d,
      hora_inicio: hora + ':00',
      hora_fin: mas1h(hora),
      titulo: nombre.trim(),
      tipo: 'personalizado',
      profe_id: profe.id,
      visibilidad: 'todos',
    }))
    const { data, error: err } = await supabase.from('sesiones').insert(rows).select('id, titulo, dia, hora_inicio')
    setSaving(false)
    if (err) { setError('No se pudo guardar: ' + err.message); return }
    setSesiones((s) => [...s, ...data])
    setNombre('')
    setDias([])
    setHora('18:00')
    setShowForm(false)
  }

  async function borrarGrupo(titulo) {
    const ids = sesiones.filter((s) => s.titulo === titulo).map((s) => s.id)
    await supabase.from('sesiones').delete().in('id', ids)
    setSesiones((s) => s.filter((x) => x.titulo !== titulo))
  }

  const grupos = {}
  sesiones.forEach((s) => { (grupos[s.titulo] ||= []).push(s) })

  return (
    <div>
      <div className="section-head">
        <h1 className="section-title">Personalizados</h1>
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Agregar</button>}
      </div>
      <p className="cal-sub">Tus alumnos personalizados. Se agregan solos al Calendario (todos ven quién entrena).</p>

      {showForm && (
        <form className="pago-form" onSubmit={agregar}>
          <label className="field">
            <span>Nombre del alumno</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" />
          </label>
          <div className="field">
            <span>Días</span>
            <div className="dias-check">
              {DIAS.map((d) => (
                <button type="button" key={d.key} className={`dia-chip ${dias.includes(d.key) ? 'on' : ''}`} onClick={() => toggleDia(d.key)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field" style={{ maxWidth: 170 }}>
            <span>Horario</span>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </label>
          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => { setShowForm(false); setError('') }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : Object.keys(grupos).length === 0 ? (
        <p className="muted">Todavía no cargaste personalizados.</p>
      ) : (
        <ul className="pago-list">
          {Object.entries(grupos).map(([titulo, arr]) => {
            const dd = [...new Set(arr.map((s) => s.dia))].sort((a, b) => ORDEN[a] - ORDEN[b])
            const label = DIAS.filter((d) => dd.includes(d.key)).map((d) => d.label).join(', ')
            const horas = [...new Set(arr.map((s) => fmtHora(s.hora_inicio)))].sort().join(' · ')
            return (
              <li key={titulo} className="pago-row">
                <div className="pago-info">
                  <span className="pago-venc">{titulo}</span>
                  <span className="pago-sub">{label} · {horas}</span>
                </div>
                <button className="pago-del" aria-label="Borrar" onClick={() => borrarGrupo(titulo)}>✕</button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
