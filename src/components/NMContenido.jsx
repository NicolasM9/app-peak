import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, Plus, X, GripVertical } from 'lucide-react'

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
const DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
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
  const [evs, setEvs] = useState([])              // filas nm_contenido de la semana
  const [plantilla, setPlantilla] = useState(DEFAULT_PLANTILLA)
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null)      // { id?, fecha, titulo, estado, nota }
  const [editPlan, setEditPlan] = useState(false)
  const [planDraft, setPlanDraft] = useState(DEFAULT_PLANTILLA)

  // --- estado de arrastre ---
  const dragRef = useRef(null)   // { id, from, pointerId, handle, target }
  const ghostRef = useRef(null)
  const boardRef = useRef(null)
  const [dragId, setDragId] = useState(null)
  const [overFecha, setOverFecha] = useState(null)

  async function load() {
    setLoading(true)
    const ini = iso(lunes), fin = iso(addDias(lunes, 6))
    const [{ data: conts }, { data: datos }] = await Promise.all([
      supabase.from('nm_contenido').select('*').gte('fecha', ini).lte('fecha', fin).order('created_at'),
      supabase.from('nm_datos').select('valor').eq('clave', 'plantilla_contenido'),
    ])
    setEvs(conts || [])
    const pl = { ...DEFAULT_PLANTILLA, ...(datos?.[0]?.valor || {}) }
    setPlantilla(pl)
    setPlanDraft(pl)
    setLoading(false)
  }
  useEffect(() => { load() }, [lunes])

  const hoy = iso(new Date())
  const dias = ORDEN.map((dow, i) => {
    const fecha = addDias(lunes, i)
    return { dow, fecha, iso: iso(fecha), n: fecha.getDate() }
  })
  const totalCargados = evs.length
  const subidos = evs.filter((e) => e.estado === 'subido').length

  function nuevo(fechaISO) {
    setEditor({ fecha: fechaISO, titulo: '', estado: 'idea', nota: '' })
  }
  function abrir(ev) {
    setEditor({ id: ev.id, fecha: ev.fecha, titulo: ev.titulo || '', estado: ev.estado || 'idea', nota: ev.nota || '' })
  }

  async function guardarEvento() {
    const ed = editor
    if (!ed.titulo.trim()) return
    const payload = { fecha: ed.fecha, titulo: ed.titulo.trim(), estado: ed.estado, nota: ed.nota.trim() || null }
    if (ed.id) {
      await supabase.from('nm_contenido').update(payload).eq('id', ed.id)
      setEvs((l) => l.map((x) => (x.id === ed.id ? { ...x, ...payload } : x)))
    } else {
      const { data } = await supabase.from('nm_contenido').insert(payload).select().single()
      if (data) setEvs((l) => [...l, data])
    }
    setEditor(null)
  }

  async function borrarEvento() {
    if (editor?.id) {
      await supabase.from('nm_contenido').delete().eq('id', editor.id)
      setEvs((l) => l.filter((x) => x.id !== editor.id))
    }
    setEditor(null)
  }

  async function moverEvento(id, nuevaFecha) {
    setEvs((l) => l.map((x) => (x.id === id ? { ...x, fecha: nuevaFecha } : x)))
    await supabase.from('nm_contenido').update({ fecha: nuevaFecha }).eq('id', id)
  }

  async function guardarPlantilla() {
    await supabase.from('nm_datos').upsert(
      { clave: 'plantilla_contenido', valor: planDraft, updated_at: new Date().toISOString() },
      { onConflict: 'clave' },
    )
    setPlantilla(planDraft)
    setEditPlan(false)
  }

  // ---- arrastre (pointer events, mouse + touch) ----
  function posGhost(x, y) {
    const g = ghostRef.current
    if (g) g.style.transform = `translate(${x + 10}px, ${y - 14}px)`
  }
  function handleDown(e, ev) {
    e.preventDefault()
    e.stopPropagation()
    const handle = e.currentTarget
    try { handle.setPointerCapture(e.pointerId) } catch { /* noop */ }
    dragRef.current = { id: ev.id, from: ev.fecha, pointerId: e.pointerId, handle, target: ev.fecha }
    setDragId(ev.id)
    setOverFecha(ev.fecha)
    const g = ghostRef.current
    if (g) { g.textContent = ev.titulo || '(sin título)'; g.style.display = 'block' }
    posGhost(e.clientX, e.clientY)
  }
  function handleMove(e) {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    e.preventDefault()
    posGhost(e.clientX, e.clientY)
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const col = el && el.closest('[data-fecha]')
    const f = col ? col.getAttribute('data-fecha') : null
    d.target = f
    setOverFecha(f)
    const b = boardRef.current
    if (b) {
      const r = b.getBoundingClientRect()
      if (e.clientX < r.left + 42) b.scrollLeft -= 16
      else if (e.clientX > r.right - 42) b.scrollLeft += 16
    }
  }
  function handleUp(e) {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    e.preventDefault()
    const g = ghostRef.current
    if (g) g.style.display = 'none'
    try { d.handle.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    const target = d.target
    dragRef.current = null
    setDragId(null)
    setOverFecha(null)
    if (target && target !== d.from) moverEvento(d.id, target)
  }

  return (
    <div className="nm-cont nm-scope">
      <div className="section-head">
        <button className="btn-back" onClick={onBack}>← NM</button>
        <button className="btn-ghost" onClick={() => setEditPlan((v) => !v)}>✏️ Estructura fija</button>
      </div>
      <h1 className="section-title">Calendario de contenido</h1>
      <p className="cal-sub">Arrastrá cada contenido de un día a otro (tomalo del ⠿). Tocá una tarjeta para editar, o el "+" para sumar.</p>

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
          <span className="muted">{totalCargados} cargados · {subidos} subidos</span>
        </div>
        <button className="nm-week-btn" onClick={() => setLunes((l) => addDias(l, 7))} aria-label="Semana siguiente"><ChevronRight size={18} /></button>
      </div>
      <button className="nm-hoy" onClick={() => setLunes(lunesDe(new Date()))}>Ir a esta semana</button>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="nm-board" ref={boardRef}>
          {dias.map(({ dow, fecha, iso: f, n }) => {
            const esHoy = f === hoy
            const items = evs.filter((e) => e.fecha === f)
            return (
              <div
                key={f}
                data-fecha={f}
                className={`nm-col ${esHoy ? 'hoy' : ''} ${overFecha === f ? 'over' : ''}`}
                style={{ '--d': COLOR[dow] }}
              >
                <div className="nm-col-head">
                  <span className="nm-col-day">
                    {DIA_CORTO[dow]} <span className="nm-col-num">{n}</span>
                    {esHoy && <span className="nm-col-hoy">hoy</span>}
                  </span>
                  <button className="nm-col-add" onClick={() => nuevo(f)} aria-label="Agregar"><Plus size={16} /></button>
                </div>
                <div className="nm-col-theme">{plantilla[dow]}</div>
                <div className="nm-col-list">
                  {items.length === 0 ? (
                    <button className="nm-col-empty" onClick={() => nuevo(f)}>＋</button>
                  ) : (
                    items.map((ev) => {
                      const est = ESTADOS[ev.estado] || ESTADOS.idea
                      return (
                        <div
                          key={ev.id}
                          className={`nm-ev ${dragId === ev.id ? 'dragging' : ''}`}
                          style={{ '--e': est.color }}
                        >
                          <span
                            className="nm-ev-grip"
                            onPointerDown={(e) => handleDown(e, ev)}
                            onPointerMove={handleMove}
                            onPointerUp={handleUp}
                            onPointerCancel={handleUp}
                            aria-label="Arrastrar"
                          >
                            <GripVertical size={15} />
                          </span>
                          <button className="nm-ev-body" onClick={() => abrir(ev)}>
                            <span className="nm-ev-tit">{ev.titulo}</span>
                            <span className="nm-ev-est" style={{ color: est.color }}>{est.label}</span>
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* fantasma de arrastre */}
      <div className="nm-ghost" ref={ghostRef} />

      {/* editor de evento */}
      {editor && (
        <div className="nm-modal-back" onClick={() => setEditor(null)}>
          <div className="nm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nm-modal-head">
              <b>{editor.id ? 'Editar contenido' : 'Nuevo contenido'}</b>
              <button className="nm-modal-x" onClick={() => setEditor(null)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <textarea
              className="nm-modal-tit"
              autoFocus
              placeholder="¿Qué subir ese día?"
              value={editor.titulo}
              onChange={(e) => setEditor((s) => ({ ...s, titulo: e.target.value }))}
            />
            <input
              className="nm-modal-nota"
              placeholder="Nota (opcional)"
              value={editor.nota}
              onChange={(e) => setEditor((s) => ({ ...s, nota: e.target.value }))}
            />
            <div className="nm-estado-pick">
              {Object.entries(ESTADOS).map(([k, v]) => (
                <button
                  key={k}
                  className={`nm-estado-b ${editor.estado === k ? 'on' : ''}`}
                  style={editor.estado === k ? { background: v.color, borderColor: v.color } : {}}
                  onClick={() => setEditor((s) => ({ ...s, estado: k }))}
                >{v.label}</button>
              ))}
            </div>
            <div className="nm-modal-dias">
              <span className="muted">Día:</span>
              {dias.map((d) => (
                <button
                  key={d.iso}
                  className={`nm-diachip ${editor.fecha === d.iso ? 'on' : ''}`}
                  onClick={() => setEditor((s) => ({ ...s, fecha: d.iso }))}
                >{DIA_CORTO[d.dow]} {d.n}</button>
              ))}
            </div>
            <div className="nm-modal-acts">
              {editor.id && <button className="nm-del" onClick={borrarEvento}>Borrar</button>}
              <span style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={() => setEditor(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEvento} disabled={!editor.titulo.trim()}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
