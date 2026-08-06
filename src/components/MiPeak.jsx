import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { totalAcuerdo } from '../lib/domain'

const DIAS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const fmtHora = (t) => (t || '').slice(0, 5).replace(/^0/, '')

export default function MiPeak({ profe }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!profe?.id) return
    ;(async () => {
      const [{ data: ses }, { data: tur }] = await Promise.all([
        supabase
          .from('sesiones')
          .select('id, dia, hora_inicio, hora_fin, titulo, alumnos')
          .eq('profe_id', profe.id),
        supabase.from('turnos').select('horas').eq('profe_id', profe.id),
      ])
      setData({ sesiones: ses || [], turnos: tur || [] })
    })()
  }, [profe?.id])

  if (!profe) return <p className="muted">Cargando…</p>

  const liquidacion = totalAcuerdo(profe)
  const sesiones = data?.sesiones || []
  const horasSemana = (data?.turnos || []).reduce((s, t) => s + Number(t.horas || 0), 0)

  const porDia = DIAS.map((d) => ({
    ...d,
    items: sesiones
      .filter((s) => s.dia === d.key)
      .sort((a, b) => (a.hora_inicio < b.hora_inicio ? -1 : 1)),
  })).filter((d) => d.items.length > 0)

  return (
    <div>
      <div className="section-head">
        <h1 className="section-title">Mi Peak</h1>
      </div>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Hola, {profe.nombre} 👋
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Mi acuerdo del mes</div>
          <div className="stat-value">{formatARS(liquidacion)}</div>
          <div className="stat-sub">base + personalizados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mis horas / semana</div>
          <div className="stat-value">{horasSemana}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mis sesiones</div>
          <div className="stat-value">{sesiones.length}</div>
          <div className="stat-sub">en la semana tipo</div>
        </div>
      </div>

      <div className="pk-card" style={{ marginTop: 14 }}>
        <div className="card-title">Mis días</div>
        {porDia.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Todavía no tenés sesiones asignadas en el calendario.
          </p>
        ) : (
          porDia.map((d) => (
            <div key={d.key} className="mipeak-dia">
              <div className="mipeak-dia-tit">{d.label}</div>
              {d.items.map((s) => (
                <div key={s.id} className="mini-row">
                  <span>
                    {s.titulo}
                    {s.alumnos ? <span className="muted"> · {s.alumnos}</span> : null}
                  </span>
                  <span className="muted">
                    {fmtHora(s.hora_inicio)}–{fmtHora(s.hora_fin)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
