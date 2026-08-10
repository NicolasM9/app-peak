import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import { hoyISO } from '../lib/domain'

function diasEntre(a, b) {
  return Math.max(0, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000))
}
export function haceCuanto(desde) {
  const d = diasEntre(desde, hoyISO())
  if (d < 1) return 'hoy'
  if (d < 30) return `hace ${d} día${d === 1 ? '' : 's'}`
  const m = Math.floor(d / 30)
  return `hace ${m} mes${m === 1 ? '' : 'es'}`
}
function dur(d) {
  if (d < 30) return `${d} día${d === 1 ? '' : 's'}`
  const m = Math.round(d / 30)
  return `${m} mes${m === 1 ? '' : 'es'}`
}

export default function Lesiones({ alumnoId, onEstadoChange }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [tipo, setTipo] = useState('')
  const [desde, setDesde] = useState(hoyISO())
  const [saving, setSaving] = useState(false)
  const [confirmar, setConfirmar] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('lesiones')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('desde', { ascending: false })
    setLista(data || [])
    setLoading(false)
  }
  useEffect(() => {
    setLoading(true)
    load()
  }, [alumnoId])

  const activas = lista.filter((l) => !l.hasta)
  const recuperadas = lista.filter((l) => l.hasta)

  // Sincroniza el estado físico del alumno con sus lesiones activas
  async function sync(lista2) {
    const act = lista2.filter((l) => !l.hasta).sort((a, b) => (a.desde < b.desde ? 1 : -1))
    if (act.length > 0) {
      await supabase.from('alumnos')
        .update({ estado_fisico: 'lesionado', lesion_detalle: act[0].tipo, lesion_desde: act[0].desde })
        .eq('id', alumnoId)
    } else if (lista2.length > 0) {
      await supabase.from('alumnos').update({ estado_fisico: 'recuperacion' }).eq('id', alumnoId)
    } else {
      await supabase.from('alumnos').update({ estado_fisico: 'sano' }).eq('id', alumnoId)
    }
    onEstadoChange && onEstadoChange()
  }

  async function agregar(e) {
    e.preventDefault()
    if (!tipo.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('lesiones')
      .insert({ alumno_id: alumnoId, tipo: tipo.trim(), desde })
      .select()
      .single()
    setSaving(false)
    if (error) return
    const nuevas = [data, ...lista]
    setLista(nuevas)
    setTipo('')
    setDesde(hoyISO())
    setShowForm(false)
    await sync(nuevas)
  }

  async function recuperar(id) {
    const hoy = hoyISO()
    await supabase.from('lesiones').update({ hasta: hoy }).eq('id', id)
    const nuevas = lista.map((l) => (l.id === id ? { ...l, hasta: hoy } : l))
    setLista(nuevas)
    await sync(nuevas)
  }

  async function borrar(id) {
    setConfirmar(null)
    await supabase.from('lesiones').delete().eq('id', id)
    const nuevas = lista.filter((l) => l.id !== id)
    setLista(nuevas)
    await sync(nuevas)
  }

  return (
    <>
      <div className="section-subhead">
        <h2>Lesiones</h2>
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Agregar</button>}
      </div>

      {showForm && (
        <form className="pago-form" onSubmit={agregar}>
          <div className="field-row">
            <label className="field">
              <span>Tipo de lesión</span>
              <input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ej: esguince de tobillo" />
            </label>
            <label className="field">
              <span>Desde</span>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || !tipo.trim()}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="muted">Sin lesiones registradas. 💪</p>
      ) : (
        <ul className="pago-list">
          {activas.map((l) => (
            <li key={l.id} className="pago-row">
              <div className="pago-info">
                <span className="pago-venc">{l.tipo}</span>
                <span className="pago-sub" style={{ color: '#f4a0a0' }}>
                  Activa · desde {formatFecha(l.desde)} ({haceCuanto(l.desde)})
                </span>
              </div>
              {confirmar === l.id ? (
                <div className="pago-confirm">
                  <span>¿Borrar?</span>
                  <button className="confirm-si" onClick={() => borrar(l.id)}>Sí</button>
                  <button className="confirm-no" onClick={() => setConfirmar(null)}>No</button>
                </div>
              ) : (
                <>
                  <button className="btn-pagado" onClick={() => recuperar(l.id)}>Recuperada</button>
                  <button className="pago-del" aria-label="Borrar" onClick={() => setConfirmar(l.id)}>✕</button>
                </>
              )}
            </li>
          ))}
          {recuperadas.map((l) => (
            <li key={l.id} className="pago-row">
              <div className="pago-info">
                <span className="pago-venc">{l.tipo}</span>
                <span className="pago-sub" style={{ color: '#86d98f' }}>
                  Recuperada · {formatFecha(l.desde)} → {formatFecha(l.hasta)} ({dur(diasEntre(l.desde, l.hasta))})
                </span>
              </div>
              {confirmar === l.id ? (
                <div className="pago-confirm">
                  <span>¿Borrar?</span>
                  <button className="confirm-si" onClick={() => borrar(l.id)}>Sí</button>
                  <button className="confirm-no" onClick={() => setConfirmar(null)}>No</button>
                </div>
              ) : (
                <button className="pago-del" aria-label="Borrar" onClick={() => setConfirmar(l.id)}>✕</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
