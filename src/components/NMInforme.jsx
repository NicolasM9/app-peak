import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import NMLogo from './NMLogo'

function r1(n) { return Math.round(n * 10) / 10 }
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function Spark({ values, color = '#111', w = 120, h = 30 }) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 6) + 3
    const y = h - 3 - ((v - min) / span) * (h - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

const PERIODOS = {
  mensual: { label: 'Último mes', meses: 1 },
  trimestral: { label: 'Último trimestre', meses: 3 },
  anual: { label: 'Último año', meses: 12 },
}

export default function NMInforme({ alumno, onClose }) {
  const [progreso, setProgreso] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mensual')
  const [comentario, setComentario] = useState('')

  useEffect(() => {
    ;(async () => {
      const [{ data: pr }, { data: ob }] = await Promise.all([
        supabase.from('nm_progreso').select('*').eq('nm_alumno_id', alumno.id).order('fecha'),
        supabase.from('nm_objetivos').select('*').eq('nm_alumno_id', alumno.id).order('created_at'),
      ])
      setProgreso(pr || []); setObjetivos(ob || [])
      setLoading(false)
    })()
  }, [alumno.id])

  const d = new Date()
  d.setMonth(d.getMonth() - PERIODOS[periodo].meses)
  const desde = iso(d)

  // agrupar progreso por métrica, calcular antes (baseline al inicio del período) → ahora
  const porMetrica = {}
  progreso.forEach((p) => { (porMetrica[p.metrica] ||= []).push(p) })
  const metricas = Object.entries(porMetrica).map(([metrica, arr]) => {
    const latest = arr[arr.length - 1]
    let base = null
    arr.forEach((e) => { if (e.fecha <= desde) base = e })
    if (!base) base = arr[0]
    const antes = Number(base.valor), ahora = Number(latest.valor)
    const enPeriodo = arr.filter((e) => e.fecha >= desde).length
    return {
      metrica, antes: r1(antes), ahora: r1(ahora), delta: r1(ahora - antes),
      unidad: latest.unidad || '', vals: arr.map((e) => Number(e.valor)),
      fAntes: base.fecha, fAhora: latest.fecha, enPeriodo,
    }
  }).sort((a, b) => a.metrica.localeCompare(b.metrica))

  const hoy = new Date()
  const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`

  return (
    <div className="informe-screen nm-scope">
      <div className="informe-toolbar">
        <button className="btn-back" onClick={onClose}>← Volver</button>
        <div className="nm-inf-periodos">
          {Object.entries(PERIODOS).map(([k, v]) => (
            <button key={k} className={`nm-per-b ${periodo === k ? 'on' : ''}`} onClick={() => setPeriodo(k)}>{v.label}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => window.print()} disabled={loading}>🖨 Descargar PDF</button>
      </div>

      <label className="informe-obj-edit">
        <span>Comentario de cierre (opcional, aparece en el informe)</span>
        <textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej: Gran progreso este mes, seguimos ajustando la técnica de sentadilla…" />
      </label>

      <div className="informe-hoja nm-inf" id="informe-print">
        <div className="nm-inf-head">
          <NMLogo height={46} />
          <div className="nm-inf-head-r">
            <div className="nm-inf-tit">Informe de progreso</div>
            <div className="nm-inf-periodo">{PERIODOS[periodo].label} · {fechaHoy}</div>
          </div>
        </div>

        <div className="nm-inf-alumno">
          <div className="nm-inf-alumno-nom">{alumno.nombre}</div>
          <div className="nm-inf-alumno-sub">{alumno.deporte || 'Sin deporte'}{alumno.inicio ? ` · desde ${formatFecha(alumno.inicio)}` : ''}</div>
        </div>

        <section className="nm-inf-sec">
          <h3 className="nm-inf-sec-tit">Objetivos</h3>
          {objetivos.length === 0 ? (
            <p className="nm-inf-vacio">Sin objetivos cargados.</p>
          ) : (
            <ul className="nm-inf-obj">
              {objetivos.map((o) => (
                <li key={o.id} className={o.cumplido ? 'ok' : ''}>
                  <span className="nm-inf-obj-mk">{o.cumplido ? '✓' : '○'}</span> {o.texto}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="nm-inf-sec">
          <h3 className="nm-inf-sec-tit">Progreso — {PERIODOS[periodo].label.toLowerCase()}</h3>
          {loading ? (
            <p className="nm-inf-vacio">Cargando…</p>
          ) : metricas.length === 0 ? (
            <p className="nm-inf-vacio">Sin mediciones cargadas todavía.</p>
          ) : (
            <div className="nm-inf-tabla">
              {metricas.map((m) => (
                <div key={m.metrica} className="nm-inf-fila">
                  <div className="nm-inf-fila-l">
                    <span className="nm-inf-fila-nom">{m.metrica}</span>
                    <span className="nm-inf-fila-val">{m.antes}{m.unidad && ' ' + m.unidad} → <b>{m.ahora}{m.unidad && ' ' + m.unidad}</b></span>
                  </div>
                  <div className="nm-inf-fila-r">
                    <span className={`nm-inf-delta ${m.delta > 0 ? 'up' : m.delta < 0 ? 'down' : ''}`}>
                      {m.delta > 0 ? '↑ +' : m.delta < 0 ? '↓ ' : ''}{m.delta !== 0 ? m.delta + (m.unidad ? ' ' + m.unidad : '') : '='}
                    </span>
                    <Spark values={m.vals.slice(-12)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {comentario.trim() && (
          <section className="nm-inf-sec">
            <h3 className="nm-inf-sec-tit">Comentario</h3>
            <p className="nm-inf-coment">{comentario.trim()}</p>
          </section>
        )}

        <div className="nm-inf-pie">NM Performance · Informe generado el {fechaHoy}</div>
      </div>
    </div>
  )
}
