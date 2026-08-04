import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { precioMensual } from '../lib/domain'
import CargaPagos from './CargaPagos'

const CATEGORIAS = [
  'Alquiler', 'Pago a profe', 'App turnos', 'App Builderpro',
  'Tarjeta', 'Dejar en cuenta', 'Mantenimiento', 'Otro',
]
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function periodoActual(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function nombreMes(iso) {
  const [y, m] = iso.split('-')
  return `${MESES[+m - 1]} ${y}`
}

export default function Pagos({ irAlAlumno }) {
  const [periodo] = useState(periodoActual())
  const [alumnos, setAlumnos] = useState([])
  const [pagos, setPagos] = useState([])
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCarga, setShowCarga] = useState(false)
  const [confirmando, setConfirmando] = useState(null)

  async function load() {
    setLoading(true)
    const [al, pg, gs] = await Promise.all([
      supabase
        .from('alumnos')
        .select('ajuste_monto, medicion_nutricional, planes(precio_mensual)')
        .eq('estado', 'activo'),
      supabase.from('pagos').select('monto, fecha_pago'),
      supabase.from('gastos').select('*').eq('periodo', periodo).order('monto', { ascending: false }),
    ])
    setAlumnos(al.data || [])
    setPagos(pg.data || [])
    setGastos(gs.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const ahora = new Date()
  const facturacion = alumnos.reduce((s, a) => s + precioMensual(a), 0)
  const cobrado = pagos
    .filter((p) => {
      if (!p.fecha_pago) return false
      const d = new Date(p.fecha_pago)
      return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth()
    })
    .reduce((s, p) => s + Number(p.monto || 0), 0)
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto || 0), 0)
  const resultado = facturacion - totalGastos

  async function delGasto(id) {
    await supabase.from('gastos').delete().eq('id', id)
    setConfirmando(null)
    await load()
  }

  if (showCarga) {
    return (
      <CargaPagos
        onIrAlumno={irAlAlumno}
        onDone={async () => { setShowCarga(false); await load() }}
        onCancel={() => setShowCarga(false)}
      />
    )
  }

  return (
    <div>
      <div className="section-head">
        <h1 className="section-title">Pagos</h1>
        <button className="btn-primary" onClick={() => setShowCarga(true)}>+ Carga rápida de pagos</button>
      </div>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Resumen de {nombreMes(periodo)}
      </p>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Facturación esperada</div>
              <div className="stat-value">{formatARS(facturacion)}</div>
              <div className="stat-sub">{alumnos.length} alumnos activos</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cobrado este mes</div>
              <div className="stat-value">{formatARS(cobrado)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Gastos</div>
              <div className="stat-value" style={{ color: '#f0999a' }}>{formatARS(totalGastos)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Resultado (esperado)</div>
              <div className="stat-value" style={{ color: '#86d98f' }}>{formatARS(resultado)}</div>
              <div className="stat-sub">{formatARS(resultado / 2)} c/u (vos y Eze)</div>
            </div>
          </div>

          <div className="section-subhead">
            <h2>Gastos de {nombreMes(periodo)}</h2>
            {!showForm && (
              <button className="btn-primary" onClick={() => setShowForm(true)}>+ Agregar</button>
            )}
          </div>

          {showForm && (
            <GastoForm
              periodo={periodo}
              onDone={async () => {
                setShowForm(false)
                await load()
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          {gastos.length === 0 ? (
            <p className="muted">Sin gastos cargados este mes.</p>
          ) : (
            <ul className="pago-list">
              {gastos.map((g) => (
                <li key={g.id} className="pago-row">
                  <div className="pago-info">
                    <span className="pago-venc">{g.categoria}</span>
                    {g.descripcion && <span className="pago-sub">{g.descripcion}</span>}
                  </div>
                  {confirmando === g.id ? (
                    <div className="pago-confirm">
                      <span>¿Borrar?</span>
                      <button className="confirm-si" onClick={() => delGasto(g.id)}>Sí</button>
                      <button className="confirm-no" onClick={() => setConfirmando(null)}>No</button>
                    </div>
                  ) : (
                    <>
                      <span className="pago-monto">{formatARS(g.monto)}</span>
                      <button
                        className="pago-del"
                        aria-label="Borrar gasto"
                        onClick={() => setConfirmando(g.id)}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {gastos.length > 0 && (
            <p className="muted" style={{ textAlign: 'right', marginTop: 10 }}>
              Total gastos: <b style={{ color: '#fff' }}>{formatARS(totalGastos)}</b>
            </p>
          )}
        </>
      )}
    </div>
  )
}

function GastoForm({ periodo, onDone, onCancel }) {
  const [categoria, setCategoria] = useState('Alquiler')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!monto || Number(monto) <= 0) {
      setError('Poné un monto válido.')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('gastos')
      .insert({ periodo, categoria, monto: Number(monto), descripcion: descripcion.trim() || null })
    setSaving(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    onDone()
  }

  return (
    <form className="pago-form" onSubmit={guardar}>
      <div className="field-row">
        <label className="field">
          <span>Categoría</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Monto</span>
          <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" />
        </label>
      </div>
      <label className="field">
        <span>Detalle (opcional)</span>
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Octavio" />
      </label>
      {error && <p className="login-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar gasto'}
        </button>
      </div>
    </form>
  )
}
