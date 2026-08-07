import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PlanDia from './PlanDia'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function contarEjercicios(item) {
  if (!item) return 0
  const enBloques = (item.bloques || []).reduce((s, b) => s + (b.ejercicios || []).length, 0)
  return (item.ec || []).length + enBloques
}

export default function Planificaciones() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState({ name: 'mes' })
  const [stats, setStats] = useState(null)

  async function loadMes(m) {
    setLoading(true)
    const { data } = await supabase
      .from('planificaciones')
      .select('*')
      .eq('mes', m)
      .order('semana')
      .order('dia')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadMes(mes)
  }, [mes])

  async function verDatos() {
    const { data } = await supabase.from('planificaciones').select('ec, bloques')
    const freq = {}
    ;(data || []).forEach((p) => {
      const ejs = [...(p.ec || []), ...(p.bloques || []).flatMap((b) => b.ejercicios || [])]
      ejs.forEach((e) => {
        const n = (e.nombre || '').toLowerCase().replace(/\s+/g, ' ').trim()
        if (n) freq[n] = (freq[n] || 0) + 1
      })
    })
    const arr = Object.entries(freq).sort((a, b) => b[1] - a[1])
    setStats({
      arr,
      total: arr.reduce((s, x) => s + x[1], 0),
      unicos: arr.length,
      unaVez: arr.filter((x) => x[1] === 1).length,
    })
    setView({ name: 'stats' })
  }

  if (view.name === 'dia') {
    return (
      <PlanDia
        mes={mes}
        mesLargo={MESES_LARGO[mes - 1]}
        semana={view.semana}
        dia={view.dia}
        item={view.item}
        onBack={async () => {
          await loadMes(mes)
          setView({ name: 'mes' })
        }}
      />
    )
  }

  if (view.name === 'stats' && stats) {
    const max = stats.arr[0]?.[1] || 1
    return (
      <div className="planif">
        <div className="section-head">
          <button className="btn-back" onClick={() => setView({ name: 'mes' })}>← Volver</button>
          <h1 className="section-title">Ejercicios más usados</h1>
        </div>
        <p className="cal-sub">
          {stats.total} ejercicios cargados · {stats.unicos} distintos · {stats.unaVez} usados una sola vez
        </p>
        <div className="stat-bars">
          {stats.arr.slice(0, 25).map(([nombre, n]) => (
            <div key={nombre} className="stat-bar-row">
              <span className="stat-bar-name" title={nombre}>{nombre}</span>
              <span className="stat-bar-track">
                <span className="stat-bar-fill" style={{ width: (n / max) * 100 + '%' }} />
              </span>
              <span className="stat-bar-num">{n}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="planif">
      <div className="section-head">
        <h1 className="section-title">Planificaciones</h1>
        <button className="btn-primary" onClick={verDatos}>Ver datos</button>
      </div>
      <p className="cal-sub">Planificación {MESES_LARGO[mes - 1]} · la editan todos los profes</p>

      <div className="mes-tabs">
        {MESES.map((m, i) => (
          <button key={m} className={`mes-tab ${mes === i + 1 ? 'on' : ''}`} onClick={() => setMes(i + 1)}>
            {m}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        [1, 2, 3, 4, 5, 6].map((sem) => {
          const delSem = items.filter((x) => x.semana === sem)
          if (sem > 4 && delSem.length === 0) return null
          return (
            <div key={sem} className="plan-semana">
              <h2 className="plan-semana-tit">Semana {sem}</h2>
              <div className="plan-dias">
                {[1, 2, 3, 4].map((d) => {
                  const item = items.find((x) => x.semana === sem && x.dia === d)
                  const n = contarEjercicios(item)
                  return (
                    <button
                      key={d}
                      className={`plan-dia-card ${item ? 'lleno' : 'vacio'}`}
                      onClick={() => setView({ name: 'dia', semana: sem, dia: d, item })}
                    >
                      <span className="plan-dia-tit">Día {d}</span>
                      <span className="plan-dia-sub">{item ? `${n} ejercicios` : '+ Planificar'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
