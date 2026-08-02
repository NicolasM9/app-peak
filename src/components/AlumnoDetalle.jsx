import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/format'
import { precioMensual, estadoPago, ESTADO_INFO, METODO_LABEL } from '../lib/domain'
import PagoForm from './PagoForm'

export default function AlumnoDetalle({ alumno, onBack, onEdit, onChanged }) {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [confirmando, setConfirmando] = useState(null)

  async function loadPagos() {
    setLoading(true)
    const { data } = await supabase
      .from('pagos')
      .select('*')
      .eq('alumno_id', alumno.id)
      .order('vencimiento', { ascending: false })
    setPagos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadPagos()
  }, [alumno.id])

  async function borrarPago(id) {
    const { error } = await supabase.from('pagos').delete().eq('id', id)
    setConfirmando(null)
    if (!error) {
      await loadPagos()
      onChanged && onChanged()
    }
  }

  const precio = precioMensual(alumno)

  return (
    <div className="detalle">
      <div className="section-head">
        <button className="btn-back" onClick={onBack}>
          ← Volver
        </button>
        <button className="btn-ghost" onClick={onEdit}>
          Editar datos
        </button>
      </div>

      <h1 className="section-title">{alumno.nombre}</h1>
      <p className="detalle-meta">
        {alumno.planes?.nombre || 'Sin plan'} · {formatARS(precio)}/mes
        {alumno.medicion_nutricional ? ' · con medición' : ''}
        {alumno.estado === 'inactivo' ? <span className="tag-inactive">inactivo</span> : null}
      </p>
      <div className="detalle-info">
        {alumno.telefono && (
          <span>
            <b>Tel:</b> {alumno.telefono}
          </span>
        )}
        {alumno.deporte && (
          <span>
            <b>Deporte:</b> {alumno.deporte}
          </span>
        )}
        {alumno.ajuste_monto ? (
          <span>
            <b>Ajuste:</b> {formatARS(alumno.ajuste_monto)}
            {alumno.ajuste_motivo ? ` (${alumno.ajuste_motivo})` : ''}
          </span>
        ) : null}
      </div>

      <div className="section-subhead">
        <h2>Pagos</h2>
        {!showPagoForm && (
          <button className="btn-primary" onClick={() => setShowPagoForm(true)}>
            + Registrar
          </button>
        )}
      </div>

      {showPagoForm && (
        <PagoForm
          alumno={alumno}
          montoSugerido={precio}
          onDone={async () => {
            setShowPagoForm(false)
            await loadPagos()
            onChanged && onChanged()
          }}
          onCancel={() => setShowPagoForm(false)}
        />
      )}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : pagos.length === 0 ? (
        <p className="muted">Sin pagos registrados todavía.</p>
      ) : (
        <ul className="pago-list">
          {pagos.map((p) => {
            const info = ESTADO_INFO[estadoPago(p)]
            return (
              <li key={p.id} className="pago-row">
                <div className="pago-info">
                  <span className="pago-venc">Vence {formatFecha(p.vencimiento)}</span>
                  <span className="pago-sub">
                    {p.fecha_pago
                      ? `Pagado ${formatFecha(p.fecha_pago)}${p.metodo ? ' · ' + METODO_LABEL[p.metodo] : ''}`
                      : 'Pendiente'}
                  </span>
                </div>

                {confirmando === p.id ? (
                  <div className="pago-confirm">
                    <span>¿Borrar?</span>
                    <button className="confirm-si" onClick={() => borrarPago(p.id)}>
                      Sí
                    </button>
                    <button className="confirm-no" onClick={() => setConfirmando(null)}>
                      No
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="pago-right">
                      <span className="pago-monto">{formatARS(p.monto)}</span>
                      <span
                        className="estado-chip"
                        style={{ background: info.tint, color: info.text }}
                      >
                        {info.label}
                      </span>
                    </div>
                    <button
                      className="pago-del"
                      title="Borrar pago"
                      aria-label="Borrar pago"
                      onClick={() => setConfirmando(p.id)}
                    >
                      ✕
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
