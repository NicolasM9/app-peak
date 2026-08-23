import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Estructura fija de la semana (editable). Clave = día JS (0=Dom … 6=Sáb).
const DEFAULT_PLANTILLA = {
  1: 'Vitamina técnica',
  2: 'Historias entrenando en Hacoaj',
  3: 'Video de Santi (producción) + historias en Peak',
  4: 'Rotativo: análisis / lesiones / online',
  5: 'Vitamina útil pre partido',
  6: 'Dump semanal',
  0: 'Dump semanal',
}
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const ORDEN = [1, 2, 3, 4, 5, 6, 0] // lunes primero
const COLOR = { 1: '#1a4fa3', 2: '#0891b2', 3: '#7c3aed', 4: '#c2410c', 5: '#16a34a', 6: '#db2777', 0: '#db2777' }
const ESTADOS = {
  idea: { label: 'Idea', color: '#6b7280' },
  listo: { label: 'Listo', color: '#d97706' },
  subido: { label: 'Subido ✓', color: '#16a34a' },
}

function iso(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function lunesDe(d) {
  const x = new Date(d)
  const dow = (x.getDay() + 6) % 7 // 0=lunes
  x.setDate(x.getDate() - dow)
  x.setHours(0, 0, 0, 0)
  return x
}
function addDias(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function corto(d) { return `${d.getDate()}/${d.getMonth() + 1}` }

export default function NMContenido({ onBack }) {
  const [lunes, setLunes] = useState(() => lunesDe(new Date()))
  const [items, setItems] = useState({})           // fecha ISO → fila
  const [plantilla, setPlantilla] = useState(DEFAULT_PLANTILLA)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)   // fecha ISO en edición
  const [draft, setDraft] = useState({ titulo: '', estado: 'idea', nota: '' })
  const [editPlan, setEditPlan] = useState(false)
  const [planDraft, setPlanDraft] = useState(DEFAULT_PLANTILLA)

  async function load() {
    setLoading(true)
    const ini = iso(lunes), fin = iso(addDias(lunes, 6))
    const [{ data: conts }, { data: datos }] = await Promise.all([
      supabase.from('nm_contenido').select('*').gte('fecha', ini).lte('fecha', fin),
      supabase.from('nm_datos').select('valor').eq('clave', 'plantilla_contenido'),
    ])
    const map = {}
    ;(conts || []).forEach((c) => { map[c.fecha] = c })
    setItems(map)
    const pl = { ...DEFAULT_PLANTILLA, ...(datos?.[0]?.valor || {}) }
    setPlantilla(pl)
    setPlanDraft(pl)
    setLoading(false)
  }
  useEffect(() => { load() }, [lunes])

  const hoy = iso(new Date())
  const dias = ORDEN.map((dow, i) => {
    const fecha = addDias(lunes, i)
    return { dow, fecha, iso: iso(fecha) }
  })
  const subidos = Object.values(items).filter((i) => i.estado === 'subido').length
  const conAlgo = Object.values(items).filter((i) => i.titulo).length

  function abrirEditor(fechaISO, item) {
    setEditando(fechaISO)
    setDraft({ titulo: item?.titulo || '', estado: item?.estado || 'idea', nota: item?.nota || '' })
  }

  async function guardar(fechaISO) {
    const existing = items[fechaISO]
    const payload = {
      fecha: fechaISO,
      titulo: draft.titulo.trim() || null,
      estado: draft.estado,
      nota: draft.nota.trim() || null,
    }
    if (existing) {
      await supabase.from('nm_contenido').update(payload).eq('id', existing.id)
      setItems((m) => ({ ...m, [fechaISO]: { ...existing, ...payload } }))
    } else {
      const { data } = await supabase.from('nm_contenido').insert(payload).select().single()
      if (data) setItems((m) => ({ ...m, [fechaISO]: data }))
    }
    setEditando(null)
  }

  async function borrar(fechaISO) {
    const existing = items[fechaISO]
    if (existing) {
      await supabase.from('nm_contenido').delete().eq('id', existing.id)
      setItems((m) => { const n = { ...m }; delete n[fechaISO]; return n })
    }
    setEditando(null)
  }

  async function guardarPlantilla() {
    await supabase.from('nm_datos').upsert(
      { clave: 'plantilla_contenido', valor: planDraft, updated_at: new Date().toISOString() },
      { onConflict: 'clave' },
    )
    setPlantilla(planDraft)
    setEditPlan(false)
  }

  return (
    <div className="nm-cont">
      <div className="section-head">
        <button className="btn-back" onClick={onBack}>← NM</button>
        <button className="btn-ghost" onClick={() => setEditPlan((v) => !v)}>✏️ Estructura fija</button>
      </div>
      <h1 className="section-title">Calendario de contenido</h1>
      <p className="cal-sub">Qué subir cada día · vas semana a semana. La estructura fija se repite; llenás el contenido de cada día.</p>

      {editPlan && (
        <div className="nm-plan-edit">
          <div className="nm-plan-tit">Estructura fija de la semana</div>
          {ORDEN.map((dow) => (
            <label key={dow} className="nm-plan-row">
              <span>{DIAS[dow]}</span>
              <input
                value={planDraft[dow] || ''}
                onChange={(e) => setPlanDraft((p) => ({ ...p, [dow]: e.target.value }))}
              />
            </label>
          ))}
          <div className="form-actions">
            <button className="btn-ghost" onClick={() => { setPlanDraft(plantilla); setEditPlan(false) }}>Cancelar</button>
            <button className="btn-primary" onClick={guardarPlantilla}>Guardar estructura</button>
          </div>
        </div>
      )}

      <div className="nm-week-nav">
        <button className="nm-week-btn" onClick={() => setLunes((l) => addDias(l, -7))} aria-label="Semana anterior"><ChevronLeft size={18} /></button>
        <div className="nm-week-label">
          <b>Semana del {corto(lunes)} al {corto(addDias(lunes, 6))}</b>
          <span className="muted">{conAlgo}/7 cargados · {subidos} subidos</span>
        </div>
        <button className="nm-week-btn" onClick={() => setLunes((l) => addDias(l, 7))} aria-label="Semana siguiente"><ChevronRight size={18} /></button>
      </div>
      <button className="nm-hoy" onClick={() => setLunes(lunesDe(new Date()))}>Ir a esta semana</button>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="nm-dias">
          {dias.map(({ dow, fecha, iso: f }) => {
            const item = items[f]
            const est = item?.estado ? ESTADOS[item.estado] : null
            const esHoy = f === hoy
            return (
              <div key={f} className={`nm-dia ${esHoy ? 'hoy' : ''}`} style={{ '--d': COLOR[dow] }}>
                <div className="nm-dia-head">
                  <span className="nm-dia-nombre">
                    {DIAS[dow]} <span className="nm-dia-fecha">{corto(fecha)}</span>
                    {esHoy && <span className="nm-dia-hoy">hoy</span>}
                  </span>
                  {est && <span className="nm-dia-estado" style={{ color: est.color }}>{est.label}</span>}
                </div>
                <div className="nm-dia-bloque">{plantilla[dow]}</div>

                {editando === f ? (
                  <div className="nm-dia-editor">
                    <textarea
                      autoFocus
                      placeholder="¿Qué va este día? (idea o contenido)"
                      value={draft.titulo}
                      onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
                    />
                    <input
                      placeholder="Nota (opcional)"
                      value={draft.nota}
                      onChange={(e) => setDraft({ ...draft, nota: e.target.value })}
                    />
                    <div className="nm-estado-pick">
                      {Object.entries(ESTADOS).map(([k, v]) => (
                        <button
                          key={k}
                          className={`nm-estado-b ${draft.estado === k ? 'on' : ''}`}
                          style={draft.estado === k ? { background: v.color, borderColor: v.color } : {}}
                          onClick={() => setDraft({ ...draft, estado: k })}
                        >{v.label}</button>
                      ))}
                    </div>
                    <div className="nm-dia-editor-acts">
                      {items[f] && <button className="nm-del" onClick={() => borrar(f)}>Borrar</button>}
                      <span style={{ flex: 1 }} />
                      <button className="btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>
                      <button className="btn-primary" onClick={() => guardar(f)}>Guardar</button>
                    </div>
                  </div>
                ) : item?.titulo ? (
                  <button className="nm-dia-cont" onClick={() => abrirEditor(f, item)}>
                    <span>{item.titulo}</span>
                    {item.nota && <span className="nm-dia-nota">{item.nota}</span>}
                  </button>
                ) : (
                  <button className="nm-dia-add" onClick={() => abrirEditor(f, null)}>＋ Agregar contenido</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
