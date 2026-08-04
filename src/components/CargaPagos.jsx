import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { precioMensual, vencimientoPorDefecto, hoyISO, estadoPago } from '../lib/domain'

function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Busca el alumno que mejor matchea un texto escrito a mano
function matchAlumno(token, alumnos) {
  const t = norm(token)
  if (!t) return null
  let best = null
  let bestScore = 0
  for (const a of alumnos) {
    const n = norm(a.nombre)
    let score = 0
    if (n === t) score = 100
    else if (n.startsWith(t) || t.startsWith(n)) score = 80
    else if (n.includes(t)) score = 60
    else {
      const tw = t.split(' ')
      const nw = n.split(' ')
      const common = tw.filter((w) => w.length > 2 && nw.some((x) => x.startsWith(w))).length
      if (common) score = 30 + common * 15
    }
    if (score > bestScore) {
      bestScore = score
      best = a
    }
  }
  return bestScore >= 30 ? best : null
}

export default function CargaPagos({ onDone, onCancel, onIrAlumno }) {
  const [alumnos, setAlumnos] = useState([])
  const [pagosMes, setPagosMes] = useState(new Set())
  const [texto, setTexto] = useState('')
  const [filas, setFilas] = useState(null)
  const [creados, setCreados] = useState([])
  const [metodo, setMetodo] = useState('transferencia')
  const [fechaPago, setFechaPago] = useState(hoyISO())
  const [vencimiento, setVencimiento] = useState(vencimientoPorDefecto())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hechos, setHechos] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('alumnos')
        .select('id, nombre, ajuste_monto, medicion_nutricional, planes(precio_mensual)')
        .eq('estado', 'activo')
        .order('nombre')
      setAlumnos(data || [])
      const ahora = new Date()
      const desde = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`
      const { data: pg } = await supabase.from('pagos').select('alumno_id, fecha_pago').gte('fecha_pago', desde)
      setPagosMes(new Set((pg || []).map((p) => p.alumno_id)))
    })()
  }, [])

  function procesar() {
    const tokens = texto.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
    setFilas(
      tokens.map((tok) => {
        const a = matchAlumno(tok, alumnos)
        return { texto: tok, alumnoId: a ? a.id : '', monto: a ? precioMensual(a) : '' }
      }),
    )
  }

  function setFila(i, k, v) {
    setFilas((list) =>
      list.map((r, idx) => {
        if (idx !== i) return r
        const nr = { ...r, [k]: v }
        if (k === 'alumnoId') {
          const a = alumnos.find((x) => x.id === Number(v))
          nr.monto = a ? precioMensual(a) : ''
        }
        return nr
      }),
    )
  }

  async function crearAlumno(i) {
    const nombre = (filas[i].texto || '').trim()
    if (!nombre) return
    const { data, error } = await supabase
      .from('alumnos')
      .insert({ nombre, estado: 'activo' })
      .select('id, nombre, ajuste_monto, medicion_nutricional, planes(precio_mensual)')
      .single()
    if (error || !data) return
    setAlumnos((list) => [...list, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setCreados((c) => [...c, { id: data.id, nombre: data.nombre }])
    setFilas((list) => list.map((r, idx) => (idx === i ? { ...r, alumnoId: data.id, monto: '' } : r)))
  }

  const validas = (filas || []).filter((f) => f.alumnoId)
  const total = validas.reduce((s, f) => s + Number(f.monto || 0), 0)
  const sinEncontrar = (filas || []).filter((f) => !f.alumnoId).length

  async function registrar() {
    setError('')
    if (validas.length === 0) {
      setError('No hay pagos para registrar. Asigná al menos un alumno.')
      return
    }
    setSaving(true)
    const pagos = validas.map((f) => {
      const p = {
        alumno_id: Number(f.alumnoId),
        monto: Number(f.monto || 0),
        vencimiento,
        fecha_pago: fechaPago,
        metodo,
      }
      p.estado = estadoPago(p)
      return p
    })
    const { error } = await supabase.from('pagos').insert(pagos)
    setSaving(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    setHechos(validas.length)
  }

  return (
    <div className="form-screen">
      <div className="section-head">
        <button className="btn-back" onClick={onCancel}>← Volver</button>
        <h1 className="section-title">Carga rápida de pagos</h1>
      </div>

      {hechos !== null ? (
        <div className="carga-ok">
          <p>✅ Se registraron <b>{hechos}</b> pago{hechos === 1 ? '' : 's'}.</p>
          {creados.length > 0 && (
            <div className="carga-creados">
              <p className="cal-sub">Alumnos nuevos — tocá para completar la ficha:</p>
              <div className="carga-creados-list">
                {creados.map((c) => (
                  <button key={c.id} type="button" className="btn-ghost" onClick={() => onIrAlumno && onIrAlumno(c.id)}>
                    {c.nombre} →
                  </button>
                ))}
              </div>
            </div>
          )}
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
            <span>Pegá o escribí los nombres (uno por línea, o separados por comas)</span>
            <textarea
              rows={7}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={'Ej:\nMartín Gómez\nAna López\nJuan Perez'}
            />
          </label>
          <div className="form-actions">
            <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
            <button className="btn-primary" onClick={procesar} disabled={!texto.trim()}>Buscar alumnos</button>
          </div>
        </>
      ) : (
        <>
          <div className="carga-batch">
            <label className="field">
              <span>Fecha de pago</span>
              <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
            </label>
            <label className="field">
              <span>Vence</span>
              <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
            </label>
            <label className="field">
              <span>Método</span>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </label>
          </div>

          <p className="cal-sub">
            {validas.length} encontrado{validas.length === 1 ? '' : 's'}
            {sinEncontrar > 0 ? ` · ${sinEncontrar} sin encontrar (asignalos o quedan afuera)` : ''}
          </p>

          <div className="carga-list">
            {filas.map((f, i) => (
              <div key={i} className={`carga-row ${f.alumnoId ? '' : 'sin'}`}>
                <span className="carga-token">{f.texto}</span>
                <select value={f.alumnoId} onChange={(e) => setFila(i, 'alumnoId', e.target.value)}>
                  <option value="">— no encontrado —</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
                <input
                  className="carga-monto"
                  type="number"
                  inputMode="numeric"
                  value={f.monto}
                  onChange={(e) => setFila(i, 'monto', e.target.value)}
                  placeholder="$"
                />
                {f.alumnoId && pagosMes.has(Number(f.alumnoId)) && <span className="carga-dup">ya pagó</span>}
                {!f.alumnoId && (
                  <button type="button" className="carga-nuevo" onClick={() => crearAlumno(i)}>+ Nuevo</button>
                )}
              </div>
            ))}
          </div>

          <div className="acuerdo-preview">
            Total a registrar ({validas.length}): <b>{formatARS(total)}</b>
          </div>

          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <button className="btn-ghost" onClick={() => setFilas(null)}>Volver a escribir</button>
            <button className="btn-primary" onClick={registrar} disabled={saving || validas.length === 0}>
              {saving ? 'Registrando…' : `Registrar ${validas.length} pago${validas.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
