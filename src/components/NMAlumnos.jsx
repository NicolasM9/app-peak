import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import NMAlumnoDetalle from './NMAlumnoDetalle'

function Form({ alumno, onDone, onCancel }) {
  const [f, setF] = useState({
    nombre: alumno?.nombre || '', deporte: alumno?.deporte || '', contacto: alumno?.contacto || '',
    objetivo: alumno?.objetivo || '', inicio: alumno?.inicio || '', activo: alumno?.activo ?? true, nota: alumno?.nota || '',
  })
  const [saving, setSaving] = useState(false)
  async function submit(e) {
    e.preventDefault()
    if (!f.nombre.trim()) return
    setSaving(true)
    const payload = {
      nombre: f.nombre.trim(), deporte: f.deporte.trim() || null, contacto: f.contacto.trim() || null,
      objetivo: f.objetivo.trim() || null, inicio: f.inicio || null, activo: f.activo, nota: f.nota.trim() || null,
    }
    if (alumno?.id) await supabase.from('nm_alumnos').update(payload).eq('id', alumno.id)
    else await supabase.from('nm_alumnos').insert(payload)
    setSaving(false)
    onDone()
  }
  return (
    <div>
      <div className="section-head"><button className="btn-back" onClick={onCancel}>← Volver</button></div>
      <h1 className="section-title">{alumno?.id ? 'Editar alumno' : 'Nuevo alumno online'}</h1>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Nombre</span><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus /></label>
        <div className="field-row">
          <label className="field"><span>Deporte</span><input value={f.deporte} onChange={(e) => setF({ ...f, deporte: e.target.value })} /></label>
          <label className="field"><span>Desde</span><input type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} /></label>
        </div>
        <label className="field"><span>Contacto (tel / @)</span><input value={f.contacto} onChange={(e) => setF({ ...f, contacto: e.target.value })} /></label>
        <label className="field"><span>Objetivo general</span><input value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} /></label>
        <label className="field"><span>Nota</span><textarea value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} /></label>
        <label className="switch-inline"><input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Activo</label>
        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving || !f.nombre.trim()}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  )
}

export default function NMAlumnos({ onBack }) {
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [verInactivos, setVerInactivos] = useState(false)
  const [view, setView] = useState({ name: 'list' })

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nm_alumnos').select('*').order('nombre')
    setAlumnos(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (view.name === 'form') {
    return <Form alumno={view.alumno} onDone={async () => { await load(); setView(view.alumno?.id ? { name: 'detalle', id: view.alumno.id } : { name: 'list' }) }} onCancel={() => setView(view.alumno?.id ? { name: 'detalle', id: view.alumno.id } : { name: 'list' })} />
  }
  if (view.name === 'detalle') {
    const alumno = alumnos.find((a) => a.id === view.id)
    if (!alumno) return <p className="muted"><button className="btn-back" onClick={() => setView({ name: 'list' })}>← Volver</button> No se encontró.</p>
    return <NMAlumnoDetalle alumno={alumno} onBack={() => setView({ name: 'list' })} onEdit={() => setView({ name: 'form', alumno })} onChanged={load} />
  }

  const filtrados = alumnos
    .filter((a) => verInactivos || a.activo)
    .filter((a) => a.nombre.toLowerCase().includes(q.trim().toLowerCase()))
  const activos = alumnos.filter((a) => a.activo).length

  return (
    <div className="nm-alu">
      <div className="section-head">
        <button className="btn-back" onClick={onBack}>← NM</button>
        <button className="btn-primary" onClick={() => setView({ name: 'form' })}>+ Nuevo</button>
      </div>
      <h1 className="section-title">Alumnos online</h1>
      <p className="cal-sub">Tus alumnos online, aparte de Peak. Pagos y progreso propios.</p>

      <input className="search" placeholder="Buscar por nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list-meta">
        <span>{activos} activos</span>
        <label className="switch-inline"><input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} /> Ver inactivos</label>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="muted">{alumnos.length === 0 ? 'Todavía no cargaste alumnos. Tocá "+ Nuevo".' : 'Sin resultados.'}</p>
      ) : (
        <ul className="alumno-list">
          {filtrados.map((a) => (
            <li key={a.id} className={`alumno-row ${a.activo ? '' : 'is-inactive'}`} onClick={() => setView({ name: 'detalle', id: a.id })}>
              <div className="alumno-info">
                <span className="alumno-name">{a.nombre}</span>
                <span className="alumno-sub">{a.deporte || 'Sin deporte'}{a.objetivo ? ` · ${a.objetivo}` : ''}</span>
              </div>
              <div className="alumno-right">
                {!a.activo && <span className="tag-inactive">inactivo</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
