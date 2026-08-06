import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Sparkline SVG propia (sin librerías). Dibuja la serie de valores.
function Spark({ values, color, w = 96, h = 28 }) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 6) + 3
      const y = h - 3 - ((v - min) / span) * (h - 6)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="ev-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Badge de variación (verde si mejoró, rojo si empeoró, gris si igual)
function Delta({ delta, pct, unidad, mejora }) {
  if (delta === 0) return <span className="ev-delta neutro">=</span>
  const cls = mejora ? 'sube' : 'baja'
  const signo = delta > 0 ? '+' : ''
  return (
    <span className={`ev-delta ${cls}`}>
      {signo}{redondear(delta)}{unidad ? ' ' + unidad : ''} {pct != null && `(${signo}${pct}%)`}
    </span>
  )
}

function redondear(n) {
  return Math.round(n * 10) / 10
}

export default function Evolucion({ alumnoId }) {
  const [mediciones, setMediciones] = useState([])
  const [testeos, setTesteos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    async function load() {
      setLoading(true)
      const [{ data: med }, { data: test }] = await Promise.all([
        supabase.from('mediciones').select('fecha, masa_muscular, masa_adiposa').eq('alumno_id', alumnoId).order('fecha'),
        supabase.from('testeos').select('fecha, categoria, test, valor, unidad').eq('alumno_id', alumnoId).order('fecha'),
      ])
      if (!vivo) return
      setMediciones(med || [])
      setTesteos(test || [])
      setLoading(false)
    }
    load()
    return () => { vivo = false }
  }, [alumnoId])

  if (loading) return null

  // --- Composición corporal (mediciones) ---
  const musc = mediciones.filter((m) => m.masa_muscular != null).map((m) => Number(m.masa_muscular))
  const adip = mediciones.filter((m) => m.masa_adiposa != null).map((m) => Number(m.masa_adiposa))

  const metricas = []
  if (musc.length) {
    const first = musc[0]
    const last = musc[musc.length - 1]
    metricas.push({
      label: 'Masa muscular', vals: musc, last, delta: last - first,
      pct: first ? Math.round(((last - first) / first) * 100) : null,
      mejora: last >= first, unidad: '%', color: '#4caf50',
    })
  }
  if (adip.length) {
    const first = adip[0]
    const last = adip[adip.length - 1]
    metricas.push({
      label: 'Masa adiposa', vals: adip, last, delta: last - first,
      pct: first ? Math.round(((last - first) / first) * 100) : null,
      mejora: last <= first, unidad: '%', color: '#eab308', // en adiposa, bajar es mejorar
    })
  }

  // --- Rendimiento (testeos agrupados por test) ---
  const porTest = {}
  testeos.forEach((t) => {
    ;(porTest[t.test] ||= []).push(t)
  })
  const tests = Object.entries(porTest)
    .map(([test, arr]) => {
      const vals = arr.map((t) => Number(t.valor))
      const first = vals[0]
      const last = vals[vals.length - 1]
      const ultimo = arr[arr.length - 1]
      return {
        test, vals, last, first,
        delta: last - first,
        pct: first ? Math.round(((last - first) / first) * 100) : null,
        mejora: last >= first, // en fuerza/salto, más es mejor
        unidad: ultimo.unidad, categoria: ultimo.categoria, registros: arr.length,
      }
    })
    .sort((a, b) => (a.categoria || '').localeCompare(b.categoria || '') || a.test.localeCompare(b.test))

  if (metricas.length === 0 && tests.length === 0) return null

  return (
    <>
      <div className="section-subhead"><h2>Evolución</h2></div>

      {metricas.length > 0 && (
        <div className="ev-grid">
          {metricas.map((m) => (
            <div key={m.label} className="ev-card">
              <div className="ev-card-top">
                <span className="ev-label">{m.label}</span>
                <span className="ev-last">{redondear(m.last)}{m.unidad}</span>
              </div>
              <div className="ev-card-bot">
                {m.vals.length > 1 ? (
                  <Delta delta={redondear(m.delta)} pct={m.pct} unidad={m.unidad} mejora={m.mejora} />
                ) : (
                  <span className="ev-delta neutro">1 registro</span>
                )}
                <Spark values={m.vals.slice(-10)} color={m.color} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tests.length > 0 && (
        <ul className="ev-tests">
          {tests.map((t) => (
            <li key={t.test} className="ev-test-row">
              <div className="ev-test-info">
                <span className="ev-test-name">{t.test}</span>
                <span className="ev-test-val">{redondear(t.last)} {t.unidad}</span>
              </div>
              <div className="ev-test-right">
                {t.vals.length > 1 ? (
                  <Delta delta={redondear(t.delta)} pct={t.pct} unidad={t.unidad} mejora={t.mejora} />
                ) : (
                  <span className="ev-delta neutro">1 registro</span>
                )}
                <Spark values={t.vals.slice(-10)} color={t.mejora ? '#4caf50' : '#ef4444'} w={72} h={24} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
