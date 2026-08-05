import { useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyEj = () => ({ nombre: '', reps: '', series: '' })
const clone = (arr) => (arr || []).map((e) => ({ ...e }))

export default function PlanDia({ mes, mesLargo, semana, dia, item, onBack }) {
  const [ec, setEc] = useState(clone(item?.ec))
  const [bloques, setBloques] = useState(
    item?.bloques?.length
      ? item.bloques.map((b) => ({ nombre: b.nombre, ejercicios: clone(b.ejercicios) }))
      : [
          { nombre: 'B1', ejercicios: [] },
          { nombre: 'B2', ejercicios: [] },
          { nombre: 'B3', ejercicios: [] },
        ],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tv, setTv] = useState(false)

  function setEcEj(i, k, v) { setEc((l) => l.map((e, idx) => (idx === i ? { ...e, [k]: v } : e))) }
  function addEc() { setEc((l) => [...l, emptyEj()]) }
  function delEc(i) { setEc((l) => l.filter((_, idx) => idx !== i)) }

  function setBEj(bi, ei, k, v) {
    setBloques((l) => l.map((b, idx) => (idx !== bi ? b : { ...b, ejercicios: b.ejercicios.map((e, j) => (j === ei ? { ...e, [k]: v } : e)) })))
  }
  function addBEj(bi) { setBloques((l) => l.map((b, idx) => (idx === bi ? { ...b, ejercicios: [...b.ejercicios, emptyEj()] } : b))) }
  function delBEj(bi, ei) { setBloques((l) => l.map((b, idx) => (idx === bi ? { ...b, ejercicios: b.ejercicios.filter((_, j) => j !== ei) } : b))) }
  function addBloque() { setBloques((l) => [...l, { nombre: 'B' + (l.length + 1), ejercicios: [] }]) }
  function delBloque(bi) { setBloques((l) => l.filter((_, idx) => idx !== bi)) }

  async function guardar() {
    setSaving(true)
    setError('')
    const limpiar = (arr) =>
      arr.filter((e) => (e.nombre || '').trim()).map((e) => ({
        nombre: e.nombre.trim(),
        reps: (e.reps || '').trim(),
        series: (e.series || '').trim(),
      }))
    const payload = {
      mes,
      semana,
      dia,
      ec: limpiar(ec),
      bloques: bloques.map((b) => ({ nombre: b.nombre, ejercicios: limpiar(b.ejercicios) })).filter((b) => b.ejercicios.length),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('planificaciones').upsert(payload, { onConflict: 'mes,semana,dia' })
    setSaving(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    onBack()
  }

  if (tv) {
    const secciones = [{ nombre: 'Entrada en calor', ejercicios: ec }, ...bloques].filter((s) => (s.ejercicios || []).some((e) => (e.nombre || '').trim()))
    return (
      <div className="plan-tv">
        <div className="plan-tv-head">
          <span>{mesLargo} · Semana {semana} · Día {dia}</span>
          <button className="btn-ghost" onClick={() => setTv(false)}>Salir</button>
        </div>
        <div className="plan-tv-body">
          {secciones.length === 0 ? (
            <p className="muted">Todavía no hay ejercicios cargados.</p>
          ) : (
            secciones.map((s, i) => (
              <div key={i} className="plan-tv-bloque">
                <div className="plan-tv-bloque-tit">{s.nombre}</div>
                {s.ejercicios.filter((e) => (e.nombre || '').trim()).map((e, j) => (
                  <div key={j} className="plan-tv-ej">
                    <span className="plan-tv-ej-nombre">{e.nombre}</span>
                    <span className="plan-tv-ej-datos">{[e.reps, e.series && e.series + ' series'].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  function EjEditor({ ejercicios, onSet, onAdd, onDel }) {
    return (
      <>
        {ejercicios.length === 0 ? (
          <p className="muted" style={{ margin: '4px 0' }}>Sin ejercicios.</p>
        ) : (
          ejercicios.map((e, i) => (
            <div key={i} className="ej-row">
              <input className="ej-nombre" value={e.nombre} onChange={(ev) => onSet(i, 'nombre', ev.target.value)} placeholder="Ejercicio" />
              <input className="ej-reps" value={e.reps} onChange={(ev) => onSet(i, 'reps', ev.target.value)} placeholder="Reps" />
              <input className="ej-series" value={e.series} onChange={(ev) => onSet(i, 'series', ev.target.value)} placeholder="Series" />
              <button type="button" className="pago-del" aria-label="Quitar" onClick={() => onDel(i)}>✕</button>
            </div>
          ))
        )}
        <button type="button" className="btn-ghost btn-add-ej" onClick={onAdd}>+ ejercicio</button>
      </>
    )
  }

  return (
    <div className="plan-editor">
      <div className="section-head">
        <button className="btn-back" onClick={onBack}>← Volver</button>
        <button className="btn-ghost" onClick={() => setTv(true)}>📺 Modo TV</button>
      </div>
      <h1 className="section-title">Semana {semana} · Día {dia}</h1>
      <p className="cal-sub">{mesLargo}</p>

      <div className="plan-bloque">
        <div className="plan-bloque-head">
          <span className="plan-bloque-tit">🔥 Entrada en calor</span>
        </div>
        <EjEditor ejercicios={ec} onSet={setEcEj} onAdd={addEc} onDel={delEc} />
      </div>

      {bloques.map((b, bi) => (
        <div key={bi} className="plan-bloque">
          <div className="plan-bloque-head">
            <span className="plan-bloque-tit plan-bloque-chip">{b.nombre}</span>
            <button type="button" className="btn-del-text" onClick={() => delBloque(bi)}>Quitar bloque</button>
          </div>
          <EjEditor
            ejercicios={b.ejercicios}
            onSet={(ei, k, v) => setBEj(bi, ei, k, v)}
            onAdd={() => addBEj(bi)}
            onDel={(ei) => delBEj(bi, ei)}
          />
        </div>
      ))}

      <button type="button" className="btn-ghost" onClick={addBloque}>+ Agregar bloque</button>

      {error && <p className="login-error">{error}</p>}
      <div className="form-actions" style={{ marginTop: 18 }}>
        <button type="button" className="btn-ghost" onClick={onBack}>Cancelar</button>
        <button type="button" className="btn-primary" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
