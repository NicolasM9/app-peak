import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const r1 = (n) => Math.round(n * 10) / 10

export default function NMComparativas({ onBack }) {
  const [alumnos, setAlumnos] = useState([])
  const [progreso, setProgreso] = useState([])
  const [loading, setLoading] = useState(true)
  const [metrica, setMetrica] = useState('')
  const [modo, setModo] = useState('valor') // 'valor' | 'mejora'

  useEffect(() => {
    ;(async () => {
      const [{ data: al }, { data: pr }] = await Promise.all([
        supabase.from('nm_alumnos').select('id, nombre, activo'),
        supabase.from('nm_progreso').select('nm_alumno_id, metrica, valor, unidad, fecha').order('fecha'),
      ])
      setAlumnos(al || [])
      setProgreso(pr || [])
      setLoading(false)
    })()
  }, [])

  const metricas = [...new Set(progreso.map((p) => p.metrica))].sort()
  const met = metrica || metricas[0] || ''

  const rows = alumnos.map((a) => {
    const arr = progreso.filter((p) => p.nm_alumno_id === a.id && p.metrica === met)
    if (!arr.length) return null
    const vals = arr.map((x) => Number(x.valor))
    return { id: a.id, nombre: a.nombre, last: vals[vals.length - 1], delta: vals[vals.length - 1] - vals[0], unidad: arr[arr.length - 1].unidad || '', n: arr.length }
  }).filter(Boolean)

  const val = (r) => (modo === 'valor' ? r.last : r.delta)
  const sorted = [...rows].sort((a, b) => val(b) - val(a))
  const maxAbs = Math.max(1, ...sorted.map((r) => Math.abs(val(r))))

  return (
    <div className="nm-cmp nm-scope">
      <div className="section-head"><button className="btn-back" onClick={onBack}>← Alumnos online</button></div>
      <h1 className="section-title">Comparativas</h1>
      <p className="cal-sub">Compará a todos tus alumnos en una métrica. Tocá el valor actual o la mejora.</p>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : metricas.length === 0 ? (
        <p className="muted">Todavía no cargaste mediciones. Cargá progreso en las fichas y acá se comparan solos.</p>
      ) : (
        <>
          <div className="nm-cmp-metricas">
            {metricas.map((m) => (
              <button key={m} className={`nm-chip ${met === m ? 'on' : ''}`} onClick={() => setMetrica(m)}>{m}</button>
            ))}
          </div>

          <div className="nm-cmp-modo">
            <button className={`nm-cmp-modo-b ${modo === 'valor' ? 'on' : ''}`} onClick={() => setModo('valor')}>Valor actual</button>
            <button className={`nm-cmp-modo-b ${modo === 'mejora' ? 'on' : ''}`} onClick={() => setModo('mejora')}>Mejora (desde el inicio)</button>
          </div>

          {sorted.length === 0 ? (
            <p className="muted">Ningún alumno tiene datos de “{met}” todavía.</p>
          ) : (
            <div className="nm-cmp-list">
              {sorted.map((r, i) => {
                const v = val(r)
                const pct = Math.max(4, (Math.abs(v) / maxAbs) * 100)
                const neg = v < 0
                return (
                  <div key={r.id} className="nm-cmp-row">
                    <span className="nm-cmp-pos">{i + 1}</span>
                    <span className="nm-cmp-name">{r.nombre}</span>
                    <div className="nm-cmp-bar-wrap">
                      <div className={`nm-cmp-bar ${neg ? 'neg' : ''}`} style={{ width: pct + '%' }} />
                    </div>
                    <span className="nm-cmp-val">
                      {modo === 'mejora' && v > 0 ? '+' : ''}{r1(v)}{r.unidad ? ' ' + r.unidad : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
