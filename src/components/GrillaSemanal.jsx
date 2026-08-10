import { useState } from 'react'

const DIAS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
]
const BASE = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const KEY_POR_GETDAY = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const TIPO_BG = { peak: '#1a4fa3', personalizado: '#6d4bd0', grupo: '#1f8f63', filmacion: '#5b6675', bloqueo: '#7a2f2f', otro: '#33455f' }
const PX_H = 62 // píxeles por hora

const toMin = (t) => { const [h, m] = (t || '00:00').split(':'); return Number(h) * 60 + Number(m) }
const fmtHora = (t) => (t || '').slice(0, 5).replace(/^0/, '')
const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export default function GrillaSemanal({ sesiones, colorOf, nombreOf, esAdmin, onEdit, onCreate, horario, onSaveHorario }) {
  const hoy = KEY_POR_GETDAY[new Date().getDay()]
  const [sel, setSel] = useState(hoy === 'domingo' ? 'lunes' : hoy)
  const [editH, setEditH] = useState(false)
  const [hIni, setHIni] = useState('07:00')
  const [hFin, setHFin] = useState('22:00')
  const [savingH, setSavingH] = useState(false)

  const conData = new Set(sesiones.map((s) => s.dia))
  const dias = DIAS.filter((d) => BASE.includes(d.key) || conData.has(d.key))

  // Rango horario: arranca/termina en el horario del gimnasio, pero se estira
  // si hay alguna sesión fuera de ese rango (para no cortar ningún turno).
  const gymIni = toMin(horario?.inicio || '07:00')
  const gymFin = toMin(horario?.fin || '22:00')
  const sMins = sesiones.flatMap((s) => [toMin(s.hora_inicio), toMin(s.hora_fin)])
  const lo = sMins.length ? Math.min(gymIni, ...sMins) : gymIni
  const hi = sMins.length ? Math.max(gymFin, ...sMins) : gymFin
  const startMin = Math.floor(lo / 60) * 60
  const endMin = Math.ceil(hi / 60) * 60
  const totalMin = Math.max(120, endMin - startMin)
  const H = (totalMin / 60) * PX_H

  function abrirEditH() {
    setHIni((horario?.inicio || '07:00').slice(0, 5))
    setHFin((horario?.fin || '22:00').slice(0, 5))
    setEditH(true)
  }
  async function guardarH() {
    if (hFin <= hIni) return
    setSavingH(true)
    await onSaveHorario({ inicio: hIni, fin: hFin })
    setSavingH(false)
    setEditH(false)
  }

  const delDia = sesiones.filter((s) => s.dia === sel)

  // Distribución en "carriles" para las que se solapan
  const sorted = [...delDia].sort((a, b) => toMin(a.hora_inicio) - toMin(b.hora_inicio) || toMin(a.hora_fin) - toMin(b.hora_fin))
  const laneEnds = []
  const placed = sorted.map((s) => {
    const st = toMin(s.hora_inicio)
    const en = Math.max(toMin(s.hora_fin), st + 25)
    let lane = laneEnds.findIndex((e) => e <= st)
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(en) } else laneEnds[lane] = en
    return { s, st, en, lane }
  })
  const nLanes = Math.max(1, laneEnds.length)

  const horas = []
  for (let m = startMin; m <= endMin; m += 60) horas.push(m)

  function bgClick(e) {
    if (!esAdmin) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    let min = startMin + (y / H) * totalMin
    min = Math.max(startMin, Math.min(endMin - 60, Math.round(min / 15) * 15))
    onCreate({ dia: sel, hora_inicio: hhmm(min), hora_fin: hhmm(min + 60) })
  }

  const evColor = (s) => (s.tipo === 'bloqueo' ? TIPO_BG.bloqueo : s.profe_id ? colorOf(s.profe_id) : (TIPO_BG[s.tipo] || TIPO_BG.otro))

  return (
    <div className="grilla">
      <div className="grilla-tabs">
        {dias.map((d) => (
          <button key={d.key} className={`grilla-tab ${sel === d.key ? 'on' : ''}`} onClick={() => setSel(d.key)}>
            {d.label}{d.key === hoy ? ' ·' : ''}
          </button>
        ))}
      </div>

      <div className="grilla-horario">
        {editH ? (
          <>
            <span className="grilla-horario-lbl">Gimnasio activo de</span>
            <input type="time" className="grilla-horario-in" value={hIni} onChange={(e) => setHIni(e.target.value)} />
            <span className="grilla-horario-lbl">a</span>
            <input type="time" className="grilla-horario-in" value={hFin} onChange={(e) => setHFin(e.target.value)} />
            <button type="button" className="btn-primary btn-mini" onClick={guardarH} disabled={savingH || hFin <= hIni}>
              {savingH ? '…' : 'Guardar'}
            </button>
            <button type="button" className="btn-ghost btn-mini" onClick={() => setEditH(false)}>Cancelar</button>
          </>
        ) : (
          <>
            <span className="grilla-horario-lbl">🕗 Gimnasio activo {fmtHora(horario?.inicio || '07:00')}–{fmtHora(horario?.fin || '22:00')}</span>
            {esAdmin && <button type="button" className="btn-link" onClick={abrirEditH}>✏️ Editar horario</button>}
          </>
        )}
      </div>

      {esAdmin && <p className="grilla-hint">Tocá un hueco para agregar o bloquear un turno · tocá un bloque para editarlo</p>}

      <div className="grilla-body" style={{ height: H }}>
        <div className="grilla-axis" style={{ height: H }}>
          {horas.map((m) => (
            <div key={m} className="grilla-hour" style={{ top: ((m - startMin) / totalMin) * H }}>{fmtHora(hhmm(m))}</div>
          ))}
        </div>
        <div className="grilla-col" style={{ height: H }} onClick={bgClick}>
          {horas.map((m) => (
            <div key={m} className="grilla-line" style={{ top: ((m - startMin) / totalMin) * H }} />
          ))}
          {delDia.length === 0 && (
            <div className="grilla-vacio">Sin turnos este día{esAdmin ? ' · tocá para agregar' : ''}</div>
          )}
          {placed.map(({ s, st, en, lane }) => {
            const top = ((st - startMin) / totalMin) * H
            const height = Math.max(20, ((en - st) / totalMin) * H - 2)
            const width = `calc(${100 / nLanes}% - 4px)`
            const left = `calc(${(lane * 100) / nLanes}% + 2px)`
            const chico = height < 34
            return (
              <button
                key={s.id}
                className="grilla-ev"
                style={{ top, height, left, width, background: evColor(s), opacity: s.tipo === 'bloqueo' ? 0.92 : 1 }}
                onClick={(e) => { e.stopPropagation(); if (esAdmin) onEdit(s) }}
                title={`${s.titulo} · ${fmtHora(s.hora_inicio)}–${fmtHora(s.hora_fin)}`}
              >
                <span className="grilla-ev-tit">{s.tipo === 'bloqueo' ? '🚫 ' : ''}{s.titulo}</span>
                {!chico && (
                  <span className="grilla-ev-sub">
                    {fmtHora(s.hora_inicio)}–{fmtHora(s.hora_fin)}
                    {s.profe_id ? ` · ${nombreOf(s.profe_id)}` : ''}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
