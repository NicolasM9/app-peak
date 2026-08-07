import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/format'
import { precioMensual, estadoPago, ESTADO_INFO, METODO_LABEL, hoyISO, waLink } from '../lib/domain'
import PagoForm from './PagoForm'
import Mediciones from './Mediciones'
import Testeos from './Testeos'
import Evolucion from './Evolucion'
import Informe from './Informe'

const EST_FISICO = {
  sano: { label: 'Sano', color: '#4caf50' },
  lesionado: { label: 'Lesionado', color: '#ef4444' },
  recuperacion: { label: 'En recuperación', color: '#eab308' },
}

export default function AlumnoDetalle({ alumno, onBack, onEdit, onChanged, autor }) {
  const [pagos, setPagos] = useState([])
  const [notas, setNotas] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [confirmando, setConfirmando] = useState(null)
  const [nuevaNota, setNuevaNota] = useState('')
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [showInforme, setShowInforme] = useState(false)

  async function loadPagos() {
    const { data } = await supabase
      .from('pagos')
      .select('*')
      .eq('alumno_id', alumno.id)
      .order('vencimiento', { ascending: false })
    setPagos(data || [])
  }
  async function loadNotas() {
    const { data } = await supabase
      .from('notas')
      .select('*')
      .eq('alumno_id', alumno.id)
      .order('created_at', { ascending: false })
    setNotas(data || [])
  }
  async function loadAsistencias() {
    const { data } = await supabase
      .from('asistencias')
      .select('fecha, presente')
      .eq('alumno_id', alumno.id)
      .order('fecha', { ascending: false })
    setAsistencias(data || [])
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadPagos(), loadNotas(), loadAsistencias()]).then(() => setLoading(false))
  }, [alumno.id])

  const mesPrefix = hoyISO().slice(0, 7)
  const vinoMes = asistencias.filter((a) => a.presente && a.fecha.slice(0, 7) === mesPrefix).length
  const ultimaVez = asistencias.find((a) => a.presente)?.fecha

  async function borrarPago(id) {
    const { error } = await supabase.from('pagos').delete().eq('id', id)
    setConfirmando(null)
    if (!error) {
      await loadPagos()
      onChanged && onChanged()
    }
  }

  async function agregarNota(e) {
    e.preventDefault()
    if (!nuevaNota.trim()) return
    setGuardandoNota(true)
    await supabase.from('notas').insert({ alumno_id: alumno.id, autor: autor || null, texto: nuevaNota.trim() })
    setGuardandoNota(false)
    setNuevaNota('')
    await loadNotas()
  }

  const precio = precioMensual(alumno)
  const ef = EST_FISICO[alumno.estado_fisico || 'sano']

  if (showInforme) return <Informe alumno={alumno} onClose={() => setShowInforme(false)} />

  return (
    <div className="detalle">
      <div className="section-head">
        <button className="btn-back" onClick={onBack}>← Volver</button>
        <div className="section-head-actions">
          <button className="btn-ghost" onClick={() => setShowInforme(true)}>📄 Crear informe</button>
          <button className="btn-ghost" onClick={onEdit}>Editar datos</button>
        </div>
      </div>

      <h1 className="section-title">{alumno.nombre}</h1>
      <p className="detalle-meta">
        {alumno.planes?.nombre || 'Sin plan'} · {formatARS(precio)}/mes
        {alumno.medicion_nutricional ? ' · con medición' : ''}
        {alumno.estado === 'inactivo' ? <span className="tag-inactive">inactivo</span> : null}
      </p>

      <div className="estado-linea">
        <span className="dot" style={{ background: ef.color }} />
        <b style={{ color: ef.color, fontWeight: 500 }}>{ef.label}</b>
        {alumno.estado_fisico !== 'sano' && alumno.lesion_detalle ? <span>— {alumno.lesion_detalle}</span> : null}
        {alumno.estado_fisico !== 'sano' && alumno.lesion_desde ? (
          <span className="muted">(desde {formatFecha(alumno.lesion_desde)})</span>
        ) : null}
      </div>

      <div className="detalle-info">
        {alumno.telefono && (
          <span className="detalle-tel">
            <b>Tel:</b> {alumno.telefono}
            <a
              className="btn-wa"
              href={waLink(alumno.telefono, `Hola ${alumno.nombre.split(' ')[0]}!`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </span>
        )}
        {alumno.deporte && <span><b>Deporte:</b> {alumno.deporte}</span>}
        {alumno.ajuste_monto ? (
          <span><b>Ajuste:</b> {formatARS(alumno.ajuste_monto)}{alumno.ajuste_motivo ? ` (${alumno.ajuste_motivo})` : ''}</span>
        ) : null}
      </div>

      {asistencias.length > 0 && (
        <div className="asis-linea">
          <b>Asistencia:</b> vino <b>{vinoMes}</b> {vinoMes === 1 ? 'vez' : 'veces'} este mes
          {ultimaVez && <span className="muted"> · última vez {formatFecha(ultimaVez)}</span>}
        </div>
      )}

      <div className="section-subhead">
        <h2>Pagos</h2>
        {!showPagoForm && <button className="btn-primary" onClick={() => setShowPagoForm(true)}>+ Registrar</button>}
      </div>
      {showPagoForm && (
        <PagoForm
          alumno={alumno}
          montoSugerido={precio}
          onDone={async () => { setShowPagoForm(false); await loadPagos(); onChanged && onChanged() }}
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
                    <button className="confirm-si" onClick={() => borrarPago(p.id)}>Sí</button>
                    <button className="confirm-no" onClick={() => setConfirmando(null)}>No</button>
                  </div>
                ) : (
                  <>
                    <div className="pago-right">
                      <span className="pago-monto">{formatARS(p.monto)}</span>
                      <span className="estado-chip" style={{ background: info.tint, color: info.text }}>{info.label}</span>
                    </div>
                    <button className="pago-del" aria-label="Borrar pago" onClick={() => setConfirmando(p.id)}>✕</button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Mediciones alumnoId={alumno.id} />

      <Testeos alumnoId={alumno.id} />

      <Evolucion alumnoId={alumno.id} />

      <div className="section-subhead"><h2>Notas de los profes</h2></div>
      <form className="nota-add" onSubmit={agregarNota}>
        <textarea
          placeholder="Escribí una nota sobre el alumno…"
          value={nuevaNota}
          onChange={(e) => setNuevaNota(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={guardandoNota || !nuevaNota.trim()}>
            {guardandoNota ? 'Guardando…' : 'Agregar nota'}
          </button>
        </div>
      </form>
      {notas.length === 0 ? (
        <p className="muted">Todavía no hay notas.</p>
      ) : (
        notas.map((n) => (
          <div key={n.id} className="nota-item">
            <div className="nota-texto">{n.texto}</div>
            <div className="nota-meta">{n.autor || 'Staff'} · {formatFecha(n.created_at)}</div>
          </div>
        ))
      )}
    </div>
  )
}
