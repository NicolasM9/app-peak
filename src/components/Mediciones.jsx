import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import { hoyISO } from '../lib/domain'

export default function Mediciones({ alumnoId }) {
  const [mediciones, setMediciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [fecha, setFecha] = useState(hoyISO())
  const [muscular, setMuscular] = useState('')
  const [adiposa, setAdiposa] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(null)
  const fileRef = useRef(null)

  async function load() {
    const { data } = await supabase
      .from('mediciones')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('fecha', { ascending: false })
    setMediciones(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [alumnoId])

  function cancelar() {
    setShowForm(false)
    setError('')
    setMuscular('')
    setAdiposa('')
    setArchivo(null)
    if (fileRef.current) fileRef.current.value = ''
    setFecha(hoyISO())
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (muscular === '' && adiposa === '' && !archivo) {
      setError('Cargá al menos un porcentaje o un archivo.')
      return
    }
    setSaving(true)

    let archivo_path = null
    let archivo_nombre = null
    if (archivo) {
      const limpio = archivo.name.replace(/[^\w.\-]+/g, '_')
      const path = `${alumnoId}/${Date.now()}_${limpio}`
      const up = await supabase.storage.from('mediciones').upload(path, archivo)
      if (up.error) {
        setSaving(false)
        setError('No se pudo subir el archivo: ' + up.error.message)
        return
      }
      archivo_path = path
      archivo_nombre = archivo.name
    }

    const { error } = await supabase.from('mediciones').insert({
      alumno_id: alumnoId,
      fecha,
      masa_muscular: muscular === '' ? null : Number(muscular),
      masa_adiposa: adiposa === '' ? null : Number(adiposa),
      archivo_path,
      archivo_nombre,
    })
    setSaving(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    cancelar()
    await load()
  }

  async function verArchivo(m) {
    const { data, error } = await supabase.storage
      .from('mediciones')
      .createSignedUrl(m.archivo_path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else alert('No se pudo abrir el archivo: ' + (error?.message || ''))
  }

  async function borrar(m) {
    if (m.archivo_path) await supabase.storage.from('mediciones').remove([m.archivo_path])
    await supabase.from('mediciones').delete().eq('id', m.id)
    setConfirmando(null)
    await load()
  }

  return (
    <>
      <div className="section-subhead">
        <h2>Mediciones</h2>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Cargar
          </button>
        )}
      </div>

      {showForm && (
        <form className="form" onSubmit={guardar}>
          <div className="field-row">
            <label className="field">
              <span>Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
            <label className="field">
              <span>% masa muscular</span>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={muscular}
                onChange={(e) => setMuscular(e.target.value)}
                placeholder="Ej: 42.5"
              />
            </label>
            <label className="field">
              <span>% masa adiposa</span>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={adiposa}
                onChange={(e) => setAdiposa(e.target.value)}
                placeholder="Ej: 18.3"
              />
            </label>
          </div>
          <label className="field">
            <span>Archivo de Diego (PDF o Excel) — opcional</span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xls,.xlsx,.csv,image/*"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={cancelar}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : mediciones.length === 0 ? (
        <p className="muted">Todavía no hay mediciones cargadas.</p>
      ) : (
        <ul className="medicion-list">
          {mediciones.map((m) => (
            <li key={m.id} className="medicion-row">
              <div className="medicion-main">
                <span className="medicion-fecha">{formatFecha(m.fecha)}</span>
                {m.archivo_path && (
                  <button type="button" className="medicion-archivo" onClick={() => verArchivo(m)}>
                    📄 {m.archivo_nombre || 'Ver archivo'}
                  </button>
                )}
              </div>
              <div className="medicion-vals">
                <span className="medicion-val">
                  <b>{m.masa_muscular != null ? m.masa_muscular + '%' : '—'}</b>
                  <small>muscular</small>
                </span>
                <span className="medicion-val">
                  <b>{m.masa_adiposa != null ? m.masa_adiposa + '%' : '—'}</b>
                  <small>adiposa</small>
                </span>
              </div>
              {confirmando === m.id ? (
                <div className="pago-confirm">
                  <span>¿Borrar?</span>
                  <button className="confirm-si" onClick={() => borrar(m)}>Sí</button>
                  <button className="confirm-no" onClick={() => setConfirmando(null)}>No</button>
                </div>
              ) : (
                <button className="pago-del" aria-label="Borrar medición" onClick={() => setConfirmando(m.id)}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
