import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO } from '../lib/domain'

const DIA_IDX = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }

// Última fecha (hoy o antes) que cae en el día de la semana de la sesión.
function ultimaFechaDia(dia) {
  const hoy = new Date()
  const target = DIA_IDX[dia] ?? hoy.getDay()
  const diff = (hoy.getDay() - target + 7) % 7
  hoy.setDate(hoy.getDate() - diff)
  return hoyISO(hoy)
}

// Roster estructurado (qué alumnos integran la sesión) + tomar lista por fecha.
export default function SesionAlumnos({ sesionId, dia }) {
  const [alumnos, setAlumnos] = useState([])
  const [rosterIds, setRosterIds] = useState(() => new Set())
  const [q, setQ] = useState('')
  const [fecha, setFecha] = useState(() => ultimaFechaDia(dia))
  const [presencias, setPresencias] = useState({}) // alumno_id -> bool (ausente si === false)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const nombreById = useMemo(() => {
    const m = new Map()
    alumnos.forEach((a) => m.set(a.id, a.nombre))
    return m
  }, [alumnos])

  async function loadAsistencia(f) {
    const { data } = await supabase
      .from('asistencias')
      .select('alumno_id, presente')
      .eq('sesion_id', sesionId)
      .eq('fecha', f)
    const m = {}
    ;(data || []).forEach((r) => (m[r.alumno_id] = r.presente))
    setPresencias(m)
  }

  useEffect(() => {
    let vivo = true
    async function init() {
      setLoading(true)
      const [{ data: al }, { data: ros }] = await Promise.all([
        supabase.from('alumnos').select('id, nombre, estado').order('nombre'),
        supabase.from('sesion_alumnos').select('alumno_id').eq('sesion_id', sesionId),
      ])
      await loadAsistencia(fecha)
      if (!vivo) return
      setAlumnos(al || [])
      setRosterIds(new Set((ros || []).map((r) => r.alumno_id)))
      setLoading(false)
    }
    init()
    return () => {
      vivo = false
    }
  }, [sesionId])

  async function cambiarFecha(f) {
    setFecha(f)
    setSavedMsg('')
    await loadAsistencia(f)
  }

  async function addAlumno(id) {
    setRosterIds((s) => new Set(s).add(id))
    setQ('')
    const { error } = await supabase.from('sesion_alumnos').insert({ sesion_id: sesionId, alumno_id: id })
    if (error) setRosterIds((s) => { const n = new Set(s); n.delete(id); return n })
  }

  async function removeAlumno(id) {
    setRosterIds((s) => { const n = new Set(s); n.delete(id); return n })
    await supabase.from('sesion_alumnos').delete().eq('sesion_id', sesionId).eq('alumno_id', id)
  }

  function togglePresente(id) {
    setPresencias((p) => ({ ...p, [id]: p[id] === false })) // si estaba ausente -> presente y viceversa
    setSavedMsg('')
  }

  async function guardarLista() {
    const rows = [...rosterIds].map((id) => ({
      sesion_id: sesionId,
      alumno_id: id,
      fecha,
      presente: presencias[id] !== false,
    }))
    if (rows.length === 0) return
    setGuardando(true)
    const { error } = await supabase.from('asistencias').upsert(rows, { onConflict: 'sesion_id,alumno_id,fecha' })
    setGuardando(false)
    if (!error) {
      setSavedMsg('Lista guardada ✓')
      setTimeout(() => setSavedMsg(''), 2500)
    }
  }

  const rosterOrdenado = useMemo(
    () => [...rosterIds].map((id) => ({ id, nombre: nombreById.get(id) || `#${id}` })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [rosterIds, nombreById],
  )

  const sugerencias = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return alumnos
      .filter((a) => a.estado === 'activo' && !rosterIds.has(a.id) && a.nombre.toLowerCase().includes(term))
      .slice(0, 8)
  }, [q, alumnos, rosterIds])

  const presentes = rosterOrdenado.filter((a) => presencias[a.id] !== false).length

  if (loading) return <p className="muted" style={{ marginTop: 16 }}>Cargando alumnos…</p>

  return (
    <div className="sa">
      <div className="section-subhead"><h2>Alumnos de la sesión</h2></div>

      <div className="sa-chips">
        {rosterOrdenado.length === 0 && <span className="muted">Todavía no agregaste alumnos.</span>}
        {rosterOrdenado.map((a) => (
          <span key={a.id} className="sa-chip">
            {a.nombre}
            <button type="button" className="sa-chip-x" aria-label={`Sacar ${a.nombre}`} onClick={() => removeAlumno(a.id)}>✕</button>
          </span>
        ))}
      </div>

      <div className="sa-add">
        <input
          className="search"
          placeholder="Buscar alumno para agregar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {sugerencias.length > 0 && (
          <ul className="sa-sug">
            {sugerencias.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => addAlumno(a.id)}>+ {a.nombre}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="section-subhead" style={{ marginTop: 22 }}><h2>Tomar lista</h2></div>
      <div className="sa-lista-head">
        <label className="field" style={{ maxWidth: 190 }}>
          <span>Fecha</span>
          <input type="date" value={fecha} onChange={(e) => cambiarFecha(e.target.value)} />
        </label>
        <span className="sa-cuenta">{presentes} / {rosterOrdenado.length} presentes</span>
      </div>

      {rosterOrdenado.length === 0 ? (
        <p className="muted">Agregá alumnos arriba para poder tomar lista.</p>
      ) : (
        <>
          <ul className="sa-lista">
            {rosterOrdenado.map((a) => {
              const presente = presencias[a.id] !== false
              return (
                <li key={a.id} className={`sa-item ${presente ? 'ok' : 'no'}`}>
                  <span className="sa-item-nombre">{a.nombre}</span>
                  <button
                    type="button"
                    className={`sa-toggle ${presente ? 'ok' : 'no'}`}
                    onClick={() => togglePresente(a.id)}
                  >
                    {presente ? '✓ Vino' : '✕ Faltó'}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="sa-guardar">
            {savedMsg && <span className="sa-saved">{savedMsg}</span>}
            <button type="button" className="btn-primary" onClick={guardarLista} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar lista'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
