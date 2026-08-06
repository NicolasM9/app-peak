import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'

const MODALIDADES = [
  { value: 'bloque_grupal', label: 'Bloque grupal' },
  { value: 'builderpro', label: 'BuilderPro' },
]

export default function AlumnoForm({ alumno, planes, onDone, onCancel }) {
  const editing = !!alumno
  const [form, setForm] = useState({
    nombre: alumno?.nombre || '',
    telefono: alumno?.telefono || '',
    fecha_nacimiento: alumno?.fecha_nacimiento || '',
    deporte: alumno?.deporte || '',
    plan_id: alumno?.plan_id || '',
    modalidad_rutina: alumno?.modalidad_rutina || 'bloque_grupal',
    ajuste_motivo: alumno?.ajuste_motivo || '',
    ajuste_monto: alumno?.ajuste_monto ?? '',
    medicion_nutricional: alumno?.medicion_nutricional || false,
    paga_directo_profe: alumno?.paga_directo_profe || false,
    estado_fisico: alumno?.estado_fisico || 'sano',
    lesion_detalle: alumno?.lesion_detalle || '',
    lesion_desde: alumno?.lesion_desde || '',
    estado: alumno?.estado || 'activo',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      deporte: form.deporte.trim() || null,
      plan_id: form.plan_id ? Number(form.plan_id) : null,
      modalidad_rutina: form.modalidad_rutina,
      ajuste_motivo: form.ajuste_motivo.trim() || null,
      ajuste_monto: form.ajuste_monto === '' ? null : Number(form.ajuste_monto),
      medicion_nutricional: form.medicion_nutricional,
      paga_directo_profe: form.paga_directo_profe,
      estado_fisico: form.estado_fisico,
      lesion_detalle: form.lesion_detalle.trim() || null,
      lesion_desde: form.lesion_desde || null,
      estado: form.estado,
    }
    const resp = editing
      ? await supabase.from('alumnos').update(payload).eq('id', alumno.id)
      : await supabase.from('alumnos').insert(payload)
    setSaving(false)
    if (resp.error) {
      setError('No se pudo guardar: ' + resp.error.message)
      return
    }
    onDone()
  }

  return (
    <div className="form-screen">
      <div className="section-head">
        <button className="btn-back" onClick={onCancel}>
          ← Volver
        </button>
        <h1 className="section-title">{editing ? 'Editar alumno' : 'Nuevo alumno'}</h1>
      </div>

      <form className="form" onSubmit={guardar}>
        <label className="field">
          <span>Nombre y apellido *</span>
          <input
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            placeholder="Ej: Martín Gómez"
          />
        </label>

        <label className="field">
          <span>Teléfono</span>
          <input
            value={form.telefono}
            onChange={(e) => set('telefono', e.target.value)}
            placeholder="11 5555-1234"
            inputMode="tel"
          />
        </label>

        <label className="field">
          <span>Fecha de nacimiento</span>
          <input
            type="date"
            value={form.fecha_nacimiento}
            onChange={(e) => set('fecha_nacimiento', e.target.value)}
          />
        </label>

        <label className="field">
          <span>Deporte / rehabilitación</span>
          <input
            value={form.deporte}
            onChange={(e) => set('deporte', e.target.value)}
            placeholder="Ej: Rugby — o 'rehab. rodilla'"
          />
        </label>

        <label className="field">
          <span>Plan</span>
          <select value={form.plan_id} onChange={(e) => set('plan_id', e.target.value)}>
            <option value="">— Sin plan —</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({formatARS(p.precio_mensual)})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Modalidad de rutina</span>
          <select
            value={form.modalidad_rutina}
            onChange={(e) => set('modalidad_rutina', e.target.value)}
          >
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Ajuste de precio ($)</span>
            <input
              type="number"
              value={form.ajuste_monto}
              onChange={(e) => set('ajuste_monto', e.target.value)}
              placeholder="Ej: -5000"
              inputMode="numeric"
            />
          </label>
          <label className="field">
            <span>Motivo del ajuste</span>
            <input
              value={form.ajuste_motivo}
              onChange={(e) => set('ajuste_motivo', e.target.value)}
              placeholder="Ej: referido"
            />
          </label>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={form.medicion_nutricional}
            onChange={(e) => set('medicion_nutricional', e.target.checked)}
          />
          <span>Hace medición con Diego (+{formatARS(20000)})</span>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={form.paga_directo_profe}
            onChange={(e) => set('paga_directo_profe', e.target.checked)}
          />
          <span>Personalizado directo: le paga 100% al profe (no suma a Peak)</span>
        </label>

        <label className="field">
          <span>Estado físico</span>
          <select value={form.estado_fisico} onChange={(e) => set('estado_fisico', e.target.value)}>
            <option value="sano">Sano</option>
            <option value="lesionado">Lesionado</option>
            <option value="recuperacion">En recuperación</option>
          </select>
        </label>

        {form.estado_fisico !== 'sano' && (
          <div className="field-row">
            <label className="field">
              <span>Detalle de la lesión</span>
              <input
                value={form.lesion_detalle}
                onChange={(e) => set('lesion_detalle', e.target.value)}
                placeholder="Ej: esguince de tobillo"
              />
            </label>
            <label className="field">
              <span>Desde</span>
              <input type="date" value={form.lesion_desde} onChange={(e) => set('lesion_desde', e.target.value)} />
            </label>
          </div>
        )}

        {editing && (
          <label className="field">
            <span>Estado</span>
            <select value={form.estado} onChange={(e) => set('estado', e.target.value)}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>
        )}

        {error && <p className="login-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
