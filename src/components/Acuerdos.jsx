import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { totalAcuerdo } from '../lib/domain'
import AcuerdoForm from './AcuerdoForm'

export default function Acuerdos() {
  const [profes, setProfes] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState({ name: 'list' })

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profes')
      .select('id, nombre, rol, base_mensual, split_resto, acuerdo_notas, personalizados')
      .eq('rol', 'profe')
      .order('id')
    setProfes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  if (view.name === 'edit') {
    return (
      <AcuerdoForm
        profe={view.profe}
        onDone={async () => {
          await load()
          setView({ name: 'list' })
        }}
        onCancel={() => setView({ name: 'list' })}
      />
    )
  }

  return (
    <div className="acuerdos">
      <h1 className="section-title">Acuerdos profes</h1>
      <p className="cal-sub">Lo que cobra cada profe (base + personalizados). Solo lo ven Nico y Eze.</p>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="acuerdo-list">
          {profes.map((p) => {
            const total = totalAcuerdo(p)
            const nPers = (p.personalizados || []).length
            return (
              <div key={p.id} className="acuerdo-card" onClick={() => setView({ name: 'edit', profe: p })}>
                <div className="acuerdo-top">
                  <span className="acuerdo-nombre">
                    {p.nombre}
                    {p.rol === 'admin' && <span className="tag-admin">dueño</span>}
                  </span>
                  <span className="acuerdo-total">
                    {formatARS(total)}<small>/mes</small>
                  </span>
                </div>
                <div className="acuerdo-sub">
                  {Number(p.base_mensual) > 0 ? `Base ${formatARS(p.base_mensual)} · ` : ''}
                  {nPers} personalizado{nPers === 1 ? '' : 's'}
                  {p.acuerdo_notas ? ' · con notas' : ''}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
