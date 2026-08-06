import { useState } from 'react'
import { supabase } from '../lib/supabase'
import SesionAlumnos from './SesionAlumnos'

const DIAS = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
]

const TIPOS = [
  { value: 'peak', label: 'Peak (grupal)' },
  { value: 'personalizado', label: 'Personalizado' },
  { value: 'grupo', label: 'Grupo con alumnos' },
  { value: 'filmacion', label: 'Filmación / contenido' },
  { value: 'otro', label: 'Otro' },
]

export default function SesionForm({ sesion, profes, onDone, onCancel }) {
  const editing = !!sesion
  const [form, setForm] = useState({
    dia: sesion?.dia || 'lunes',
    hora_inicio: (sesion?.hora_inicio || '08:00').slice(0, 5),
    hora_fin: (sesion?.hora_fin || '09:00').slice(0, 5),
    titulo: sesion?.titulo || '',
    tipo: sesion?.tipo || 'peak',
    profe_id: sesion?.profe_id || '',
    alumnos: sesion?.alumnos || '',
    visibilidad: sesion?.visibilidad || 'todos',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!form.titulo.trim()) {
      setError('Ponele un título (ej: Peak AM).')
      return
    }
    if (form.hora_fin <= form.hora_inicio) {
      setError('La hora de fin tiene que ser posterior a la de inicio.')
      return
    }
    setSaving(true)
    const payload = {
      dia: form.dia,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      profe_id: form.profe_id ? Number(form.profe_id) : null,
      alumnos: form.alumnos.trim() || null,
      visibilidad: form.visibilidad,
    }
    const resp = editing
      ? await supabase.from('sesiones').update(payload).eq('id', sesion.id)
      : await supabase.from('sesiones').insert(payload)
    setSaving(false)
    if (resp.error) {
      setError('No se pudo guardar: ' + resp.error.message)
      return
    }
    onDone()
  }

  async function borrar() {
    const { error } = await supabase.from('sesiones').delete().eq('id', sesion.id)
    if (error) {
      setError('No se pudo borrar: ' + error.message)
      return
    }
    onDone()
  }

  return (
    <div className="form-screen">
      <div className="section-head">
        <button className="btn-back" onClick={onCancel}>← Volver</button>
        <h1 className="section-title">{editing ? 'Editar sesión' : 'Nueva sesión'}</h1>
      </div>

      <form className="form" onSubmit={guardar}>
        <label className="field">
          <span>Título</span>
          <input
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Ej: Peak AM, Personalizado Octi, Nico filmación"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Día</span>
            <select value={form.dia} onChange={(e) => set('dia', e.target.value)}>
              {DIAS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Desde</span>
            <input type="time" value={form.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)} />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input type="time" value={form.hora_fin} onChange={(e) => set('hora_fin', e.target.value)} />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Tipo (color)</span>
            <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Profe a cargo</span>
            <select value={form.profe_id} onChange={(e) => set('profe_id', e.target.value)}>
              <option value="">— Sin asignar —</option>
              {profes.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Alumnos (opcional)</span>
          <input
            value={form.alumnos}
            onChange={(e) => set('alumnos', e.target.value)}
            placeholder="Ej: Felix - Juli"
          />
        </label>

        <label className="field">
          <span>Quién lo ve</span>
          <select value={form.visibilidad} onChange={(e) => set('visibilidad', e.target.value)}>
            <option value="todos">Todo el staff</option>
            <option value="admin">Solo admins (Nico y Eze)</option>
          </select>
        </label>

        {error && <p className="login-error">{error}</p>}

        <div className="form-actions">
          {editing ? (
            confirmando ? (
              <div className="pago-confirm" style={{ marginRight: 'auto' }}>
                <span>¿Borrar la sesión?</span>
                <button type="button" className="confirm-si" onClick={borrar}>Sí</button>
                <button type="button" className="confirm-no" onClick={() => setConfirmando(false)}>No</button>
              </div>
            ) : (
              <button type="button" className="btn-del-text" onClick={() => setConfirmando(true)} style={{ marginRight: 'auto' }}>
                Borrar
              </button>
            )
          ) : null}
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>

      {editing && <SesionAlumnos sesionId={sesion.id} dia={sesion.dia} />}
    </div>
  )
}
