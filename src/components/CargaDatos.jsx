import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { matchAlumno } from '../lib/match'
import { formatFecha } from '../lib/format'

// Arma una fecha ISO (YYYY-MM-DD) validada, o '' si no es válida.
function iso(y, m, d) {
  const yy = String(y).padStart(4, '0')
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  const nm = Number(mm)
  const nd = Number(dd)
  if (nm < 1 || nm > 12 || nd < 1 || nd > 31) return ''
  const dt = new Date(`${yy}-${mm}-${dd}T00:00:00`)
  if (isNaN(dt.getTime())) return ''
  return `${yy}-${mm}-${dd}`
}

// Interpreta una fecha suelta en varios formatos (dd/mm/aaaa, aaaa-mm-dd, dd-mm-aa…).
export function parseFecha(str) {
  const s = (str || '').trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/) // aaaa-mm-dd
  if (m) return iso(m[1], m[2], m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/) // dd-mm-aaaa (o aa)
  if (m) {
    let y = m[3]
    if (y.length === 2) y = (Number(y) > 30 ? '19' : '20') + y
    return iso(y, m[2], m[1])
  }
  return ''
}

// Separa "Nombre <sep> fecha": pela la fecha del final, el resto es el nombre.
function parseLineaFecha(linea) {
  const s = (linea || '').trim()
  const m = s.match(/^(.*?)[\s:,\-]*((?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}))\s*$/)
  if (m) {
    const valor = parseFecha(m[2])
    if (valor) return { nombre: m[1].trim() || s, valor }
  }
  return { nombre: s, valor: '' }
}

// Separa "Nombre <sep> texto libre" (deporte). Requiere un separador claro.
function parseLineaTexto(linea) {
  const s = (linea || '').trim()
  const m = s.match(/^(.*?)\s*[\t:,;|]\s*(.+)$/) || s.match(/^(.*?)\s+[-–—]\s+(.+)$/)
  if (m) return { nombre: m[1].trim(), valor: m[2].trim() }
  return { nombre: s, valor: '' }
}

const CAMPOS = {
  fecha_nacimiento: {
    titulo: 'fechas de nacimiento',
    etiqueta: 'nombre y fecha de nacimiento',
    ejemplo: 'Ej:\nMartín Gómez 12/05/1990\nAna López: 1990-05-12\nJuan Perez - 3/8/88',
    ayuda: 'La fecha va al final (dd/mm/aaaa, aaaa-mm-dd o dd-mm-aa).',
    parse: parseLineaFecha,
    tipoInput: 'date',
    mostrar: (v) => (v ? formatFecha(v) : ''),
  },
  deporte: {
    titulo: 'deportes',
    etiqueta: 'nombre y deporte',
    ejemplo: 'Ej:\nMartín Gómez, Rugby\nAna López: Hockey\nJuan Perez - Rehab. rodilla',
    ayuda: 'Separá el nombre del deporte con coma, dos puntos o guión.',
    parse: parseLineaTexto,
    tipoInput: 'text',
    mostrar: (v) => v || '',
  },
}

export default function CargaDatos({ onDone, onCancel }) {
  const [campo, setCampo] = useState('fecha_nacimiento')
  const [alumnos, setAlumnos] = useState([])
  const [texto, setTexto] = useState('')
  const [filas, setFilas] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hechos, setHechos] = useState(null)

  const cfg = CAMPOS[campo]

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('alumnos')
        .select('id, nombre, fecha_nacimiento, deporte')
        .order('nombre')
      setAlumnos(data || [])
    })()
  }, [])

  // Sugerencias de deportes ya cargados (para autocompletar)
  const deportesExistentes = useMemo(
    () => [...new Set(alumnos.map((a) => (a.deporte || '').trim()).filter(Boolean))].sort(),
    [alumnos],
  )

  const valorActualById = (id) => {
    const a = alumnos.find((x) => x.id === Number(id))
    return a ? a[campo] || '' : ''
  }

  function procesar() {
    const lineas = texto.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    setFilas(
      lineas.map((linea) => {
        const { nombre, valor } = cfg.parse(linea)
        const a = matchAlumno(nombre, alumnos)
        return { texto: linea, nombre, alumnoId: a ? a.id : '', valor }
      }),
    )
  }

  function setFila(i, k, v) {
    setFilas((list) => list.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)))
  }

  const validas = (filas || []).filter((f) => f.alumnoId && String(f.valor).trim())
  const sinAsignar = (filas || []).filter((f) => !f.alumnoId).length

  async function guardar() {
    setError('')
    if (validas.length === 0) {
      setError('No hay datos para guardar. Asigná alumno y valor.')
      return
    }
    setSaving(true)
    const results = await Promise.all(
      validas.map((f) =>
        supabase.from('alumnos').update({ [campo]: String(f.valor).trim() }).eq('id', Number(f.alumnoId)),
      ),
    )
    setSaving(false)
    const falló = results.find((r) => r.error)
    if (falló) {
      setError('No se pudieron guardar todos: ' + falló.error.message)
      return
    }
    // Reflejo local para el indicador "reemplaza"
    setAlumnos((list) =>
      list.map((a) => {
        const f = validas.find((v) => Number(v.alumnoId) === a.id)
        return f ? { ...a, [campo]: String(f.valor).trim() } : a
      }),
    )
    setHechos(validas.length)
  }

  function cambiarCampo(c) {
    setCampo(c)
    setFilas(null)
    setTexto('')
    setError('')
    setHechos(null)
  }

  return (
    <div className="form-screen">
      <div className="section-head">
        <button className="btn-back" onClick={onCancel}>← Volver</button>
        <h1 className="section-title">Cargar datos en masa</h1>
      </div>

      <div className="cd-tabs">
        {Object.entries(CAMPOS).map(([k, v]) => (
          <button
            key={k}
            className={`cd-tab ${campo === k ? 'on' : ''}`}
            onClick={() => cambiarCampo(k)}
          >
            {v.titulo[0].toUpperCase() + v.titulo.slice(1)}
          </button>
        ))}
      </div>

      {hechos !== null ? (
        <div className="carga-ok">
          <p>✅ Se guardaron <b>{hechos}</b> {cfg.titulo}.</p>
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
            <span>Pegá una línea por alumno: {cfg.etiqueta}</span>
            <textarea
              rows={8}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={cfg.ejemplo}
            />
          </label>
          <p className="cal-sub">{cfg.ayuda}</p>
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

          {campo === 'deporte' && (
            <datalist id="cd-deportes">
              {deportesExistentes.map((d) => <option key={d} value={d} />)}
            </datalist>
          )}

          <div className="carga-list">
            {filas.map((f, i) => {
              const actual = f.alumnoId ? valorActualById(f.alumnoId) : ''
              const distinto = actual && String(actual).trim() !== String(f.valor).trim()
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
                    type={cfg.tipoInput}
                    list={campo === 'deporte' ? 'cd-deportes' : undefined}
                    value={f.valor}
                    onChange={(e) => setFila(i, 'valor', e.target.value)}
                    placeholder={campo === 'deporte' ? 'Deporte' : ''}
                  />
                  {distinto && (
                    <span className="ct-actual" title="Valor actual (se va a reemplazar)">
                      reemplaza {cfg.mostrar(actual)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <button className="btn-ghost" onClick={() => setFilas(null)}>Volver a escribir</button>
            <button className="btn-primary" onClick={guardar} disabled={saving || validas.length === 0}>
              {saving ? 'Guardando…' : `Guardar ${validas.length}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
