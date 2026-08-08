import { useState } from 'react'
import { formatARS } from '../lib/format'
import { waLink } from '../lib/domain'

const DEFAULT_MSG = 'Hola {nombre}! 👋 Te recordamos la cuota de {mes} de Peak Performance: {monto}. ¡Gracias! 💪'

export default function AvisoDeudores({ deudores, mes, onClose }) {
  const [plantilla, setPlantilla] = useState(DEFAULT_MSG)
  const [enviados, setEnviados] = useState(() => new Set())

  const armarMsg = (c) =>
    plantilla
      .replaceAll('{nombre}', c.nombre.split(' ')[0])
      .replaceAll('{monto}', formatARS(c.monto))
      .replaceAll('{mes}', mes)

  const conTel = deudores.filter((c) => c.telefono)
  const sinTel = deudores.filter((c) => !c.telefono)

  function marcar(id) {
    setEnviados((s) => new Set(s).add(id))
  }
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto) } catch { /* sin permiso */ }
  }

  return (
    <div>
      <div className="section-head">
        <button className="btn-back" onClick={onClose}>← Volver</button>
        <h1 className="section-title">Avisar a deudores</h1>
      </div>
      <p className="cal-sub" style={{ marginTop: -4 }}>
        {deudores.length} deben · {conTel.length} con WhatsApp · {enviados.size} marcados como enviados
      </p>

      <label className="field" style={{ marginTop: 8 }}>
        <span>Mensaje (podés editarlo)</span>
        <textarea rows={3} value={plantilla} onChange={(e) => setPlantilla(e.target.value)} />
      </label>
      <p className="cal-sub" style={{ marginTop: -6 }}>
        Se reemplazan solos: <b>{'{nombre}'}</b>, <b>{'{monto}'}</b>, <b>{'{mes}'}</b>. Cada WhatsApp abre el chat con el mensaje listo.
      </p>

      {deudores.length === 0 ? (
        <p className="muted">¡Todos al día este mes! 🎉</p>
      ) : (
        <ul className="pago-list">
          {conTel.map((c) => {
            const enviado = enviados.has(c.id)
            return (
              <li key={c.id} className={`pago-row ${enviado ? 'av-done' : ''}`}>
                <div className="pago-info">
                  <span className="pago-venc">{c.nombre}</span>
                  <span className="pago-sub">{formatARS(c.monto)}</span>
                </div>
                {enviado ? (
                  <span className="cobro-ok">✓ Enviado</span>
                ) : (
                  <a
                    className="btn-wa"
                    href={waLink(c.telefono, armarMsg(c))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => marcar(c.id)}
                  >
                    WhatsApp
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {sinTel.length > 0 && (
        <>
          <div className="section-subhead"><h2>Sin teléfono ({sinTel.length})</h2></div>
          <p className="cal-sub" style={{ marginTop: -4 }}>
            Cargá sus números (Alumnos → ☎ Teléfonos) para poder avisarles.
          </p>
          <ul className="pago-list">
            {sinTel.map((c) => (
              <li key={c.id} className="pago-row">
                <div className="pago-info">
                  <span className="pago-venc">{c.nombre}</span>
                  <span className="pago-sub">{formatARS(c.monto)}</span>
                </div>
                <button className="btn-ghost" onClick={() => copiar(armarMsg(c))}>Copiar mensaje</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
