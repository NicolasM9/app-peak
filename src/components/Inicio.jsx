import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/format'
import { estadoPago, MEDICION_MONTO } from '../lib/domain'

export default function Inicio() {
  const [data, setData] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [{ data: alumnos }, { data: pagos }] = await Promise.all([
        supabase.from('alumnos').select('id, estado, medicion_nutricional'),
        supabase.from('pagos').select('monto, vencimiento, fecha_pago, alumnos(nombre)'),
      ])
      setData({ alumnos: alumnos || [], pagos: pagos || [] })
    })()
  }, [])

  if (!data) return <p className="muted">Cargando…</p>

  const activos = data.alumnos.filter((a) => a.estado === 'activo').length
  const conMedicion = data.alumnos.filter((a) => a.medicion_nutricional).length
  const pendientes = data.pagos.filter((p) => !p.fecha_pago)
  const pendienteTotal = pendientes.reduce((s, p) => s + Number(p.monto || 0), 0)

  const ahora = new Date()
  const ingresosMes = data.pagos
    .filter((p) => {
      if (!p.fecha_pago) return false
      const d = new Date(p.fecha_pago)
      return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth()
    })
    .reduce((s, p) => s + Number(p.monto || 0), 0)

  const proximos = [...pendientes]
    .sort((a, b) => (a.vencimiento < b.vencimiento ? -1 : 1))
    .slice(0, 5)

  return (
    <div>
      <div className="section-head">
        <h1 className="section-title">Inicio</h1>
      </div>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Resumen rápido de cómo viene todo
      </p>

      <div className="stat-grid">
        <Stat label="Alumnos activos" value={activos} />
        <Stat
          label="Cobros pendientes"
          value={formatARS(pendienteTotal)}
          sub={`${pendientes.length} pago${pendientes.length === 1 ? '' : 's'}`}
          accent="#f2cd5c"
        />
        <Stat label="Ingresos del mes" value={formatARS(ingresosMes)} />
        <Stat
          label="Medición (Diego)"
          value={conMedicion}
          sub={`${formatARS(conMedicion * MEDICION_MONTO)} a Diego`}
        />
      </div>

      <div className="pk-card" style={{ marginTop: 14 }}>
        <div className="card-title">Próximos vencimientos</div>
        {proximos.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No hay pagos pendientes. 🎉
          </p>
        ) : (
          proximos.map((p, i) => (
            <div key={i} className="mini-row">
              <span>{p.alumnos?.nombre || 'Alumno'}</span>
              <span className={estadoPago(p) === 'vencido' ? 'txt-venc' : 'muted'}>
                {estadoPago(p) === 'vencido' ? 'vencido' : formatFecha(p.vencimiento)} ·{' '}
                {formatARS(p.monto)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : null}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
