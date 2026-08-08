import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const key = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`

export default function HistorialFacturacion({ onClose }) {
  const [pagos, setPagos] = useState(null)
  const [gastos, setGastos] = useState([])

  useEffect(() => {
    ;(async () => {
      const [{ data: pg }, { data: gs }] = await Promise.all([
        supabase.from('pagos').select('monto, fecha_pago'),
        supabase.from('gastos').select('periodo, monto'),
      ])
      setPagos(pg || [])
      setGastos(gs || [])
    })()
  }, [])

  const { meses, total, promedio, mejor } = useMemo(() => {
    if (!pagos) return {}
    const map = new Map() // 'YYYY-MM' -> { cobrado, n, gastos }
    const get = (k) => map.get(k) || { cobrado: 0, n: 0, gastos: 0 }
    pagos.forEach((p) => {
      if (!p.fecha_pago) return
      const d = new Date(p.fecha_pago)
      const k = key(d.getFullYear(), d.getMonth())
      const o = get(k)
      o.cobrado += Number(p.monto || 0)
      o.n += 1
      map.set(k, o)
    })
    gastos.forEach((g) => {
      const k = (g.periodo || '').slice(0, 7)
      if (!k) return
      const o = get(k)
      o.gastos += Number(g.monto || 0)
      map.set(k, o)
    })

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
    return { meses: capped.slice().reverse(), total, promedio, mejor }
  }, [pagos, gastos])

  if (!pagos) return <p className="muted">Cargando…</p>

  const max = Math.max(1, ...meses.map((x) => x.cobrado))

  return (
    <div>
      <div className="section-head">
        <button className="btn-back" onClick={onClose}>← Volver</button>
        <h1 className="section-title">Historial de facturación</h1>
      </div>
      <p className="cal-sub" style={{ marginTop: -4 }}>
        Lo cobrado cada mes (se arma solo con los pagos que vas registrando).
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
            <div key={x.k} className="hf-row">
              <span className="hf-lbl">{x.label}</span>
              <span className="estad-bar-track">
                <span className="estad-bar-fill" style={{ width: (x.cobrado / max) * 100 + '%' }} />
              </span>
              <span className="hf-val">
                {formatARS(x.cobrado)}
                {x.n > 0 && <span className="hf-n"> · {x.n}</span>}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
