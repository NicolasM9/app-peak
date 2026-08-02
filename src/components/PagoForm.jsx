import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { vencimientoPorDefecto, hoyISO, estadoPago } from '../lib/domain'

export default function PagoForm({ alumno, montoSugerido, onDone, onCancel }) {
  const [monto, setMonto] = useState(montoSugerido || '')
  const [vencimiento, setVencimiento] = useState(vencimientoPorDefecto())
  const [pagado, setPagado] = useState(true)
  const [fechaPago, setFechaPago] = useState(hoyISO())
  const [metodo, setMetodo] = useState('transferencia')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!monto || Number(monto) <= 0) {
      setError('Poné un monto válido.')
      return
    }
    if (!vencimiento) {
      setError('Elegí la fecha de vencimiento.')
      return
    }
    setSaving(true)
    const pago = {
      alumno_id: alumno.id,
      monto: Number(monto),
      vencimiento,
      fecha_pago: pagado ? fechaPago : null,
      metodo: pagado ? metodo : null,
    }
    pago.estado = estadoPago(pago)
    const { error } = await supabase.from('pagos').insert(pago)
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
          <span>Monto</span>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="field">
          <span>Vence</span>
          <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
        </label>
      </div>

      <label className="check">
        <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} />
        <span>Ya pagó</span>
      </label>

      {pagado && (
        <div className="field-row">
          <label className="field">
            <span>Fecha de pago</span>
            <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
          </label>
          <label className="field">
            <span>Método</span>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </label>
        </div>
      )}

      {error && <p className="login-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar pago'}
        </button>
      </div>
    </form>
  )
}
