import { formatARS } from '../lib/format'
import { totalAcuerdo } from '../lib/domain'

export default function MiAcuerdo({ profe }) {
  if (!profe) return <p className="muted">Cargando…</p>
  const total = totalAcuerdo(profe)
  const pers = profe.personalizados || []
  const split = Number(profe.split_resto ?? 60)

  return (
    <div>
      <div className="section-head">
        <h1 className="section-title">Mi acuerdo</h1>
      </div>
      <p className="cal-sub">Lo que cobrás por mes. Esto lo ves solo vos.</p>

      <div className="stat-grid" style={{ marginTop: 14 }}>
        <div className="stat-card">
          <div className="stat-label">Total del mes</div>
          <div className="stat-value">{formatARS(total)}</div>
          <div className="stat-sub">base + personalizados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Base</div>
          <div className="stat-value">{formatARS(profe.base_mensual || 0)}</div>
        </div>
      </div>

      <div className="section-subhead"><h2>Personalizados</h2></div>
      {pers.length === 0 ? (
        <p className="muted">No tenés personalizados en tu acuerdo.</p>
      ) : (
        <ul className="pago-list">
          {pers.map((x, i) => {
            const bruto = Number(x.monto || 0)
            const tuyo = x.al100 ? bruto : Math.round((bruto * split) / 100)
            return (
              <li key={i} className="pago-row">
                <div className="pago-info">
                  <span className="pago-venc">{x.nombre || '—'}</span>
                  <span className="pago-sub">{x.al100 ? '100% para vos' : `${split}% para vos`}</span>
                </div>
                <span className="pago-monto">{formatARS(tuyo)}</span>
              </li>
            )
          })}
        </ul>
      )}

      {profe.acuerdo_notas && (
        <>
          <div className="section-subhead"><h2>Notas</h2></div>
          <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{profe.acuerdo_notas}</p>
        </>
      )}

      <p className="cal-sub" style={{ marginTop: 16 }}>
        Si algo no coincide, hablalo con Nico o Eze — el acuerdo lo edita la administración.
      </p>
    </div>
  )
}
