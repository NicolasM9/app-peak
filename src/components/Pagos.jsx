import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { precioMensual, hoyISO, vencimientoPorDefecto, estadoPago, ESTADO_INFO, waLink, MEDICION_MONTO } from '../lib/domain'
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
  const [profes, setProfes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGasto, setEditGasto] = useState(null)
  const [showCarga, setShowCarga] = useState(false)
  const [confirmando, setConfirmando] = useState(null)
  const [showPagados, setShowPagados] = useState(false)
  const [marcando, setMarcando] = useState(null)

  async function load() {
    setLoading(true)
    const [al, pg, gs, pr] = await Promise.all([
      supabase
        .from('alumnos')
        .select('id, nombre, telefono, ajuste_monto, medicion_nutricional, paga_directo_profe, planes(precio_mensual)')
        .eq('estado', 'activo')
        .order('nombre'),
      supabase.from('pagos').select('alumno_id, monto, fecha_pago'),
      supabase.from('gastos').select('*').eq('periodo', periodo).order('monto', { ascending: false }),
      supabase
        .from('profes')
        .select('id, nombre, base_mensual')
        .eq('rol', 'profe')
        .order('id'),
    ])
    setAlumnos(al.data || [])
    setPagos(pg.data || [])
    setGastos(gs.data || [])
    setProfes(pr.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const ahora = new Date()
  const alumnosPeak = alumnos.filter((a) => !a.paga_directo_profe)
  const facturacion = alumnosPeak.reduce((s, a) => s + precioMensual(a), 0)
  const cobrado = pagos
    .filter((p) => {
      if (!p.fecha_pago) return false
      const d = new Date(p.fecha_pago)
      return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth()
    })
    .reduce((s, p) => s + Number(p.monto || 0), 0)

  // Cobros del mes: por cada alumno activo, si ya pagó este mes o todavía debe
  const pagadoSet = new Set(
    pagos
      .filter((p) => {
        if (!p.fecha_pago) return false
        const d = new Date(p.fecha_pago)
        return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth()
      })
      .map((p) => p.alumno_id),
  )
  const venc6 = vencimientoPorDefecto()
  const rank = { vencido: 0, por_vencer: 1, al_dia: 2 }
  const cobros = alumnosPeak
    .map((a) => {
      const pagado = pagadoSet.has(a.id)
      const estado = estadoPago({ vencimiento: venc6, fecha_pago: pagado ? hoyISO() : null })
      return { id: a.id, nombre: a.nombre, telefono: a.telefono, monto: precioMensual(a), pagado, estado }
    })
    .sort((x, y) => (rank[x.estado] - rank[y.estado]) || x.nombre.localeCompare(y.nombre))
  const deudores = cobros.filter((c) => !c.pagado)
  const deudaTotal = deudores.reduce((s, c) => s + c.monto, 0)
  const listado = showPagados ? cobros : deudores
  const mesTxt = MESES[ahora.getMonth()].toLowerCase()
  const msgCobro = (c) =>
    `Hola ${c.nombre}! 👋 Te recordamos la cuota de ${mesTxt} de Peak Performance: ${formatARS(c.monto)}. ¡Gracias! 💪`

  async function marcarPagado(c) {
    setMarcando(c.id)
    const pago = { alumno_id: c.id, monto: c.monto, vencimiento: venc6, fecha_pago: hoyISO(), metodo: null }
    pago.estado = estadoPago(pago)
    await supabase.from('pagos').insert(pago)
    setMarcando(null)
    await load()
  }

  const pagosProfes = profes
    .map((p) => ({ id: p.id, nombre: p.nombre, monto: Number(p.base_mensual || 0) }))
    .filter((x) => x.monto > 0)
  const totalProfes = pagosProfes.reduce((s, x) => s + x.monto, 0)
  const gastosManuales = gastos.reduce((s, g) => s + Number(g.monto || 0), 0)
  const conMedicion = alumnosPeak.filter((a) => a.medicion_nutricional).length
  const diegoTotal = conMedicion * MEDICION_MONTO
  const totalGastos = gastosManuales + totalProfes + diegoTotal
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
              <div className="stat-sub">{alumnosPeak.length} alumnos activos</div>
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
            <h2>Cobros de {nombreMes(periodo)}</h2>
            {deudores.length > 0 && (
              <button className="btn-ghost" onClick={() => setShowPagados((s) => !s)}>
                {showPagados ? 'Solo deudores' : 'Ver todos'}
              </button>
            )}
          </div>
          <p className="cal-sub" style={{ marginTop: -4 }}>
            {cobros.length - deudores.length} al día ·{' '}
            <b style={{ color: '#f0999a' }}>{deudores.length} deben</b> ({formatARS(deudaTotal)})
          </p>
          {listado.length === 0 ? (
            <p className="muted">¡Todos al día este mes! 🎉</p>
          ) : (
            <ul className="pago-list">
              {listado.map((c) => {
                const info = ESTADO_INFO[c.estado]
                const wa = waLink(c.telefono, msgCobro(c))
                return (
                  <li key={c.id} className="pago-row">
                    <div className="pago-info">
                      <span className="pago-venc">{c.nombre}</span>
                      <span className="pago-sub" style={{ color: info.text }}>{info.label}</span>
                    </div>
                    <span className="pago-monto">{formatARS(c.monto)}</span>
                    {!c.pagado && (
                      <div className="cobro-actions">
                        {wa ? (
                          <a className="btn-wa" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        ) : (
                          <span className="btn-wa off" title="Sin teléfono cargado">sin tel</span>
                        )}
                        <button
                          className="btn-pagado"
                          disabled={marcando === c.id}
                          onClick={() => marcarPagado(c)}
                        >
                          {marcando === c.id ? '…' : 'Pagado'}
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="section-subhead">
            <h2>Gastos de {nombreMes(periodo)}</h2>
            {!showForm && (
              <button className="btn-primary" onClick={() => { setEditGasto(null); setShowForm(true) }}>+ Agregar</button>
            )}
          </div>

          {showForm && (
            <GastoForm
              periodo={periodo}
              gasto={editGasto}
              onDone={async () => {
                setShowForm(false)
                setEditGasto(null)
                await load()
              }}
              onCancel={() => { setShowForm(false); setEditGasto(null) }}
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
                        className="pago-edit"
                        aria-label="Editar gasto"
                        onClick={() => { setEditGasto(g); setShowForm(true) }}
                      >
                        ✎
                      </button>
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

          <div className="section-subhead">
            <h2>Pagos a profes y terceros</h2>
          </div>
          <p className="cal-sub" style={{ marginTop: -4 }}>
            Sueldo base de cada profe (sale de Acuerdos) y el pago a Diego por las mediciones. Se actualizan solos.
          </p>
          {pagosProfes.length === 0 && diegoTotal === 0 ? (
            <p className="muted">Van a aparecer acá cuando cargues sueldos base (en Acuerdos) o mediciones (en las fichas).</p>
          ) : (
            <ul className="pago-list">
              {pagosProfes.map((x) => (
                <li key={x.id} className="pago-row">
                  <div className="pago-info">
                    <span className="pago-venc">{x.nombre}</span>
                    <span className="pago-sub">según acuerdo</span>
                  </div>
                  <span className="pago-monto">{formatARS(x.monto)}</span>
                </li>
              ))}
              {diegoTotal > 0 && (
                <li className="pago-row">
                  <div className="pago-info">
                    <span className="pago-venc">Diego Sívori</span>
                    <span className="pago-sub">mediciones · {conMedicion} alumno{conMedicion === 1 ? '' : 's'}</span>
                  </div>
                  <span className="pago-monto">{formatARS(diegoTotal)}</span>
                </li>
              )}
            </ul>
          )}

          {(gastos.length > 0 || pagosProfes.length > 0 || diegoTotal > 0) && (
            <p className="muted" style={{ textAlign: 'right', marginTop: 12 }}>
              Total gastos (con profes): <b style={{ color: '#fff' }}>{formatARS(totalGastos)}</b>
            </p>
          )}
        </>
      )}
    </div>
  )
}

function GastoForm({ periodo, gasto, onDone, onCancel }) {
  const editing = !!gasto
  const [categoria, setCategoria] = useState(gasto?.categoria || 'Alquiler')
  const [monto, setMonto] = useState(gasto?.monto ?? '')
  const [descripcion, setDescripcion] = useState(gasto?.descripcion || '')
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
    const payload = { periodo, categoria, monto: Number(monto), descripcion: descripcion.trim() || null }
    const { error } = editing
      ? await supabase.from('gastos').update(payload).eq('id', gasto.id)
      : await supabase.from('gastos').insert(payload)
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
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar gasto'}
        </button>
      </div>
    </form>
  )
}
