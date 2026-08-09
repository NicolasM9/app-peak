import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const key = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`

export default function HistorialFacturacion({ onClose }) {
  const [pagos, setPagos] = useState(null)
  const [gastos, setGastos] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [detalle, setDetalle] = useState(null) // { label, items:[{nombre,monto}] }

  useEffect(() => {
    ;(async () => {
      const [{ data: pg }, { data: gs }, { data: al }] = await Promise.all([
        supabase.from('pagos').select('alumno_id, monto, fecha_pago'),
        supabase.from('gastos').select('periodo, monto'),
        supabase.from('alumnos').select('id, nombre'),
      ])
      setPagos(pg || [])
      setGastos(gs || [])
      setAlumnos(al || [])
    })()
  }, [])

  const { meses, total, promedio, mejor, pagadores } = useMemo(() => {
    if (!pagos) return {}
    const nombreById = new Map(alumnos.map((a) => [a.id, a.nombre]))
    const map = new Map() // 'YYYY-MM' -> { cobrado, n, gastos }
    const pagad = new Map() // 'YYYY-MM' -> [{nombre, monto}]
    const get = (k) => map.get(k) || { cobrado: 0, n: 0, gastos: 0 }
    pagos.forEach((p) => {
      if (!p.fecha_pago) return
      const d = new Date(p.fecha_pago)
      const k = key(d.getFullYear(), d.getMonth())
      const o = get(k)
      o.cobrado += Number(p.monto || 0)
      o.n += 1
      map.set(k, o)
      if (!pagad.has(k)) pagad.set(k, [])
      pagad.get(k).push({ nombre: nombreById.get(p.alumno_id) || `#${p.alumno_id}`, monto: Number(p.monto || 0) })
    })
    gastos.forEach((g) => {
      const k = (g.periodo || '').slice(0, 7)
      if (!k) return
      const o = get(k)
      o.gastos += Number(g.monto || 0)
      map.set(k, o)
    })
    pagad.forEach((arr) => arr.sort((a, b) => b.monto - a.monto))

    const now = new Date()
    const keys = [...map.keys()].sort()
    const [sy, sm] = (keys[0] || key(now.getFullYear(), now.getMonth())).split('-').map(Number)
    const list = []
    let y = sy
    let m = sm - 1
    while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
      const k = key(y, m)
      list.push({ k, label: `${MESES[m]} ${String(y).slice(2)}`, ...get(k) })
      m++
      if (m > 11) { m = 0; y++ }
    }
    const capped = list.slice(-12)
    const conCobro = capped.filter((x) => x.cobrado > 0)
    const total = capped.reduce((s, x) => s + x.cobrado, 0)
    const promedio = conCobro.length ? Math.round(total / conCobro.length) : 0
    const mejor = capped.reduce((a, b) => (b.cobrado > (a?.cobrado || 0) ? b : a), null)
    return { meses: capped.slice().reverse(), total, promedio, mejor, pagadores: pagad }
  }, [pagos, gastos, alumnos])

  if (!pagos) return <p className="muted">Cargando…</p>

  const max = Math.max(1, ...meses.map((x) => x.cobrado))

  return (
    <div>
      <div className="section-head">
        <button className="btn-back" onClick={onClose}>← Volver</button>
        <h1 className="section-title">Historial de facturación</h1>
      </div>
      <p className="cal-sub" style={{ marginTop: -4 }}>
        Lo cobrado cada mes (se arma solo con los pagos que vas registrando). Tocá un mes para ver quién pagó.
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total cobrado</div>
          <div className="stat-value">{formatARS(total)}</div>
          <div className="stat-sub">{meses.length} mes{meses.length === 1 ? '' : 'es'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Promedio mensual</div>
          <div className="stat-value">{formatARS(promedio)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mejor mes</div>
          <div className="stat-value">{mejor && mejor.cobrado > 0 ? formatARS(mejor.cobrado) : '—'}</div>
          {mejor && mejor.cobrado > 0 && <div className="stat-sub">{mejor.label}</div>}
        </div>
      </div>

      <div className="pk-card" style={{ marginTop: 14 }}>
        <div className="card-title">Cobrado por mes</div>
        {meses.every((x) => x.cobrado === 0) ? (
          <p className="muted" style={{ margin: 0 }}>
            Todavía no hay cobros registrados. A medida que cargues pagos cada mes, se va llenando este historial.
          </p>
        ) : (
          meses.map((x) => (
            <button
              key={x.k}
              className="hf-row hf-row-btn"
              disabled={x.n === 0}
              onClick={() => setDetalle({ label: x.label, items: pagadores.get(x.k) || [] })}
            >
              <span className="hf-lbl">{x.label}</span>
              <span className="estad-bar-track">
                <span className="estad-bar-fill" style={{ width: (x.cobrado / max) * 100 + '%' }} />
              </span>
              <span className="hf-val">
                {formatARS(x.cobrado)}
                {x.n > 0 && <span className="hf-n"> · {x.n}</span>}
              </span>
            </button>
          ))
        )}
      </div>

      {detalle && (
        <div className="estad-drill" onClick={() => setDetalle(null)}>
          <div className="estad-drill-box" onClick={(e) => e.stopPropagation()}>
            <div className="estad-drill-head">
              <b>Pagos de {detalle.label}</b> <span className="muted">({detalle.items.length})</span>
              <button className="btn-ghost" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
            <div className="estad-drill-list">
              {detalle.items.map((it, i) => (
                <div key={i} className="mini-row">
                  <span>{it.nombre}</span>
                  <span className="muted">{formatARS(it.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
