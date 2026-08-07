import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/format'

function r1(n) {
  return Math.round(n * 10) / 10
}

export default function Informe({ alumno, onClose }) {
  const [mediciones, setMediciones] = useState([])
  const [testeos, setTesteos] = useState([])
  const [objetivos, setObjetivos] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [{ data: med }, { data: test }] = await Promise.all([
        supabase.from('mediciones').select('fecha, masa_muscular, masa_adiposa').eq('alumno_id', alumno.id).order('fecha'),
        supabase.from('testeos').select('fecha, categoria, test, valor, unidad').eq('alumno_id', alumno.id).order('fecha'),
      ])
      setMediciones(med || [])
      setTesteos(test || [])
      setLoading(false)
    })()
  }, [alumno.id])

  // Mediciones: primero vs último por métrica
  const musc = mediciones.filter((m) => m.masa_muscular != null)
  const adip = mediciones.filter((m) => m.masa_adiposa != null)
  const metrica = (arr, key, mejorSube) => {
    if (!arr.length) return null
    const first = Number(arr[0][key])
    const last = Number(arr[arr.length - 1][key])
    const delta = r1(last - first)
    const mejora = mejorSube ? last >= first : last <= first
    return { first: r1(first), last: r1(last), delta, mejora, n: arr.length }
  }
  const mMusc = metrica(musc, 'masa_muscular', true)
  const mAdip = metrica(adip, 'masa_adiposa', false)

  // Testeos agrupados por ejercicio
  const porTest = {}
  testeos.forEach((t) => { (porTest[t.test] ||= []).push(t) })
  const tests = Object.entries(porTest).map(([test, arr]) => {
    const first = Number(arr[0].valor)
    const last = Number(arr[arr.length - 1].valor)
    const delta = r1(last - first)
    const pct = first ? Math.round(((last - first) / first) * 100) : null
    return { test, first: r1(first), last: r1(last), delta, pct, unidad: arr[arr.length - 1].unidad, mejora: last >= first, n: arr.length }
  }).sort((a, b) => a.test.localeCompare(b.test))

  const hoy = new Date()
  const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`

  return (
    <div className="informe-screen">
      <div className="informe-toolbar">
        <button className="btn-back" onClick={onClose}>← Volver</button>
        <button className="btn-primary" onClick={() => window.print()} disabled={loading}>🖨 Descargar PDF</button>
      </div>

      <label className="informe-obj-edit">
        <span>Objetivos (aparecen en el informe)</span>
        <textarea
          rows={3}
          value={objetivos}
          onChange={(e) => setObjetivos(e.target.value)}
          placeholder="Ej: subir 10% en sentadilla, bajar 2% de adiposa, mejorar salto…"
        />
      </label>

      <div className="informe-hoja" id="informe-print">
        <div className="inf-head">
          <div>
            <div className="inf-marca">PEAK PERFORMANCE</div>
            <div className="inf-tit">Informe de progreso</div>
          </div>
          <div className="inf-fecha">{fechaHoy}</div>
        </div>

        <div className="inf-alumno">
          <div className="inf-alumno-nombre">{alumno.nombre}</div>
          <div className="inf-alumno-sub">
            {alumno.planes?.nombre || 'Sin plan'}{alumno.deporte ? ` · ${alumno.deporte}` : ''}
          </div>
        </div>

        {objetivos.trim() && (
          <section className="inf-sec">
            <h3 className="inf-sec-tit">Objetivos</h3>
            <p className="inf-obj">{objetivos.trim()}</p>
          </section>
        )}

        <section className="inf-sec">
          <h3 className="inf-sec-tit">Composición corporal</h3>
          {!mMusc && !mAdip ? (
            <p className="inf-vacio">Sin mediciones cargadas todavía.</p>
          ) : (
            <div className="inf-tabla">
              {mMusc && <FilaMetrica label="Masa muscular" u="%" m={mMusc} />}
              {mAdip && <FilaMetrica label="Masa adiposa" u="%" m={mAdip} />}
            </div>
          )}
        </section>

        <section className="inf-sec">
          <h3 className="inf-sec-tit">Rendimiento (testeos)</h3>
          {tests.length === 0 ? (
            <p className="inf-vacio">Sin testeos cargados todavía.</p>
          ) : (
            <div className="inf-tabla">
              {tests.map((t) => (
                <div key={t.test} className="inf-fila">
                  <span className="inf-fila-lbl">{t.test}</span>
                  <span className="inf-fila-val">{t.first} → <b>{t.last}</b> {t.unidad}</span>
                  <span className={`inf-fila-delta ${t.mejora ? 'up' : 'down'}`}>
                    {t.delta > 0 ? '+' : ''}{t.delta} {t.unidad}{t.pct != null ? ` (${t.pct > 0 ? '+' : ''}${t.pct}%)` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="inf-pie">Peak Performance · Informe generado el {fechaHoy}</div>
      </div>
    </div>
  )
}

function FilaMetrica({ label, u, m }) {
  return (
    <div className="inf-fila">
      <span className="inf-fila-lbl">{label}</span>
      <span className="inf-fila-val">{m.first}{u} → <b>{m.last}{u}</b></span>
      <span className={`inf-fila-delta ${m.mejora ? 'up' : 'down'}`}>
        {m.delta > 0 ? '+' : ''}{m.delta}{u}
      </span>
    </div>
  )
}
