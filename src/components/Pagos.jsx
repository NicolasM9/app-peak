import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/format'
import { estadoPago, ESTADO_INFO } from '../lib/domain'

export default function Pagos() {
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('pagos')
      .select('id, monto, vencimiento, fecha_pago, alumnos(nombre)')
      .is('fecha_pago', null)
      .order('vencimiento')
    setPendientes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const vencidos = pendientes.filter((p) => estadoPago(p) === 'vencido')
  const porVencer = pendientes.filter((p) => estadoPago(p) === 'por_vencer')
  const total = pendientes.reduce((s, p) => s + Number(p.monto || 0), 0)

  return (
    <div>
      <div className="section-head">
        <h1 className="section-title">Pagos</h1>
      </div>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Deudores del centro. La facturación total y los gastos los sumamos en el próximo paso (con tu
        Excel).
      </p>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : pendientes.length === 0 ? (
        <p className="muted">¡Todo al día! No hay pagos pendientes. 🎉</p>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 16 }}>
            {pendientes.length} pendiente{pendientes.length === 1 ? '' : 's'} · {formatARS(total)} por
            cobrar
          </p>
          {vencidos.length > 0 && <Sec title="Vencidos" items={vencidos} estado="vencido" />}
          {porVencer.length > 0 && <Sec title="Por vencer" items={porVencer} estado="por_vencer" />}
        </>
      )}
    </div>
  )
}

function Sec({ title, items, estado }) {
  const info = ESTADO_INFO[estado]
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ color: info.text, fontSize: 16, marginBottom: 10 }}>
        {title} ({items.length})
      </h2>
      <ul className="pago-list">
        {items.map((p) => (
          <li key={p.id} className="pago-row">
            <div className="pago-info">
              <span className="pago-venc">{p.alumnos?.nombre || 'Alumno'}</span>
              <span className="pago-sub">Vence {formatFecha(p.vencimiento)}</span>
            </div>
            <span className="pago-monto">{formatARS(p.monto)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
