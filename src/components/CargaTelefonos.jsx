import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { matchAlumno } from '../lib/match'

// Separa una línea "Nombre <sep> teléfono" en nombre y teléfono.
// El teléfono es el bloque final con al menos 6 dígitos (tolera +, -, ( ), espacios).
export function parseLinea(linea) {
  const s = (linea || '').trim()
  const m = s.match(/[:,\-\s]*(\(?\+?\d[\d\s()\-]{4,})\s*$/)
  if (m && (m[1].match(/\d/g) || []).length >= 6) {
    const tel = m[1].trim()
    const nombre = s.slice(0, m.index).replace(/[:,\-\s(]+$/, '').trim()
    return { nombre: nombre || s, tel }
  }
  return { nombre: s, tel: '' }
}

export default function CargaTelefonos({ onDone, onCancel }) {
  const [alumnos, setAlumnos] = useState([])
  const [texto, setTexto] = useState('')
  const [filas, setFilas] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hechos, setHechos] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('alumnos')
        .select('id, nombre, telefono')
        .order('nombre')
      setAlumnos(data || [])
    })()
  }, [])

  const telById = (id) => alumnos.find((a) => a.id === Number(id))?.telefono || ''

  function procesar() {
    const lineas = texto.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    setFilas(
      lineas.map((linea) => {
        const { nombre, tel } = parseLinea(linea)
        const a = matchAlumno(nombre, alumnos)
        return { texto: linea, nombre, alumnoId: a ? a.id : '', tel }
      }),
    )
  }

  function setFila(i, k, v) {
    setFilas((list) => list.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)))
  }

  const validas = (filas || []).filter((f) => f.alumnoId && f.tel.trim())
  const sinAsignar = (filas || []).filter((f) => !f.alumnoId).length

  async function guardar() {
    setError('')
    if (validas.length === 0) {
      setError('No hay teléfonos para guardar. Asigná alumno y número.')
      return
    }
    setSaving(true)
    const results = await Promise.all(
      validas.map((f) =>
        supabase.from('alumnos').update({ telefono: f.tel.trim() }).eq('id', Number(f.alumnoId)),
      ),
    )
    setSaving(false)
    const falló = results.find((r) => r.error)
    if (falló) {
      setError('No se pudieron guardar todos: ' + falló.error.message)
      return
    }
    setHechos(validas.length)
  }

  return (
    <div className="form-screen">
      <div className="section-head">
        <button className="btn-back" onClick={onCancel}>← Volver</button>
        <h1 className="section-title">Cargar teléfonos</h1>
      </div>

      {hechos !== null ? (
        <div className="carga-ok">
          <p>✅ Se guardaron <b>{hechos}</b> teléfono{hechos === 1 ? '' : 's'}.</p>
          <div className="form-actions">
            <button className="btn-ghost" onClick={() => { setHechos(null); setFilas(null); setTexto('') }}>
              Cargar más
            </button>
            <button className="btn-primary" onClick={onDone}>Listo</button>
          </div>
        </div>
      ) : filas === null ? (
        <>
          <label className="field">
            <span>Pegá una línea por alumno: nombre y teléfono</span>
            <textarea
              rows={8}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={'Ej:\nMartín Gómez 11 5678 1234\nAna López: 1145678901\nJuan Perez, +54 9 11 2345 6789'}
            />
          </label>
          <p className="cal-sub">Sirve separando con coma, dos puntos, guión o solo espacio. El número va al final.</p>
          <div className="form-actions">
            <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
            <button className="btn-primary" onClick={procesar} disabled={!texto.trim()}>Buscar alumnos</button>
          </div>
        </>
      ) : (
        <>
          <p className="cal-sub">
            {validas.length} listo{validas.length === 1 ? '' : 's'} para guardar
            {sinAsignar > 0 ? ` · ${sinAsignar} sin encontrar (asignalos o quedan afuera)` : ''}
          </p>

          <div className="carga-list">
            {filas.map((f, i) => {
              const telActual = f.alumnoId ? telById(f.alumnoId) : ''
              return (
                <div key={i} className={`carga-row ct-row ${f.alumnoId ? '' : 'sin'}`}>
                  <select value={f.alumnoId} onChange={(e) => setFila(i, 'alumnoId', e.target.value)}>
                    <option value="">— no encontrado ({f.nombre}) —</option>
                    {alumnos.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                  <input
                    className="ct-tel"
                    type="tel"
                    inputMode="tel"
                    value={f.tel}
                    onChange={(e) => setFila(i, 'tel', e.target.value)}
                    placeholder="Teléfono"
                  />
                  {telActual && telActual !== f.tel.trim() && (
                    <span className="ct-actual" title="Teléfono actual (se va a reemplazar)">reemplaza {telActual}</span>
                  )}
                </div>
              )
            })}
          </div>

          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <button className="btn-ghost" onClick={() => setFilas(null)}>Volver a escribir</button>
            <button className="btn-primary" onClick={guardar} disabled={saving || validas.length === 0}>
              {saving ? 'Guardando…' : `Guardar ${validas.length} teléfono${validas.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
