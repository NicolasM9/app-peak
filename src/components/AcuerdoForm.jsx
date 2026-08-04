import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { totalAcuerdo } from '../lib/domain'

export default function AcuerdoForm({ profe, onDone, onCancel }) {
  const [base, setBase] = useState(profe.base_mensual ?? 0)
  const [split, setSplit] = useState(profe.split_resto ?? 60)
  const [notas, setNotas] = useState(profe.acuerdo_notas || '')
  const [pers, setPers] = useState(Array.isArray(profe.personalizados) ? profe.personalizados : [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setP(i, k, v) {
    setPers((list) => list.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)))
  }
  function addP() {
    setPers((list) => [...list, { nombre: '', monto: '', al100: true }])
  }
  function delP(i) {
    setPers((list) => list.filter((_, idx) => idx !== i))
  }

  const preview = totalAcuerdo({
    base_mensual: base,
    split_resto: split,
    personalizados: pers.map((x) => ({ ...x, monto: Number(x.monto || 0) })),
  })

  async function guardar(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      base_mensual: Number(base || 0),
      split_resto: Number(split || 60),
      acuerdo_notas: notas.trim() || null,
      personalizados: pers
        .filter((x) => (x.nombre || '').trim() || x.monto)
        .map((x) => ({ nombre: (x.nombre || '').trim(), monto: Number(x.monto || 0), al100: !!x.al100 })),
    }
    const { error } = await supabase.from('profes').update(payload).eq('id', profe.id)
    setSaving(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    onDone()
  }

  return (
    <div className="form-screen">
      <div className="section-head">
        <button className="btn-back" onClick={onCancel}>← Volver</button>
        <h1 className="section-title">Acuerdo · {profe.nombre}</h1>
      </div>

      <form className="form" onSubmit={guardar}>
        <div className="field-row">
          <label className="field">
            <span>Sueldo base ($/mes)</span>
            <input type="number" inputMode="numeric" value={base} onChange={(e) => setBase(e.target.value)} placeholder="0" />
          </label>
          <label className="field">
            <span>% del profe en el resto</span>
            <input type="number" inputMode="numeric" value={split} onChange={(e) => setSplit(e.target.value)} placeholder="60" />
          </label>
        </div>

        <div className="section-subhead">
          <h2>Personalizados</h2>
          <button type="button" className="btn-primary" onClick={addP}>+ Agregar</button>
        </div>
        <p className="cal-sub" style={{ marginTop: -4 }}>
          Tocá el % de cada uno: <b>100%</b> = va entero al profe · <b>{split}%</b> = lo que le queda del resto.
        </p>

        {pers.length === 0 ? (
          <p className="muted">Sin personalizados. Tocá “+ Agregar”.</p>
        ) : (
          <div className="pers-list">
            {pers.map((x, i) => (
              <div key={i} className="pers-row">
                <input
                  className="pers-nombre"
                  value={x.nombre}
                  onChange={(e) => setP(i, 'nombre', e.target.value)}
                  placeholder="Nombre"
                />
                <input
                  className="pers-monto"
                  type="number"
                  inputMode="numeric"
                  value={x.monto}
                  onChange={(e) => setP(i, 'monto', e.target.value)}
                  placeholder="$/mes"
                />
                <button
                  type="button"
                  className={`pers-100 ${x.al100 ? 'on' : ''}`}
                  onClick={() => setP(i, 'al100', !x.al100)}
                >
                  {x.al100 ? '100%' : `${split}%`}
                </button>
                <button type="button" className="pago-del" aria-label="Quitar" onClick={() => delP(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <label className="field">
          <span>Notas del acuerdo (condiciones, bonos, feriados…)</span>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: bono trimestral por 5 alumnos nuevos; alumnos nuevos 100% el primer mes; feriados rotativos; uso libre del centro…"
          />
        </label>

        <div className="acuerdo-preview">
          Cobra por mes: <b>{formatARS(preview)}</b>
        </div>

        {error && <p className="login-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  )
}
