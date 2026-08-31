import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyEj = () => ({ nombre: '', series: '', reps: '', peso: '', obs: '' })
const clone = (arr) => (arr || []).map((e) => ({ nombre: e.nombre || '', series: e.series || '', reps: e.reps || '', peso: e.peso || '', obs: e.obs || '' }))
const limpiarEj = (arr) =>
  (arr || []).filter((e) => (e.nombre || '').trim()).map((e) => ({
    nombre: e.nombre.trim(),
    series: (e.series || '').toString().trim(),
    reps: (e.reps || '').toString().trim(),
    peso: (e.peso || '').toString().trim(),
    obs: (e.obs || '').toString().trim(),
  }))
const move = (list, i, dir) => {
  const j = i + dir
  if (j < 0 || j >= list.length) return list
  const c = [...list]
  ;[c[i], c[j]] = [c[j], c[i]]
  return c
}
const defaultBloques = () => [
  { nombre: 'Bloque 1', ejercicios: [emptyEj()] },
  { nombre: 'Bloque 2', ejercicios: [] },
]

// Parsear texto pegado desde Excel (filas por salto de línea, columnas por tab)
function parseFilas(text) {
  return (text || '').replace(/\r/g, '').split('\n').filter((l) => l.trim()).map((l) => {
    let c = l.split('\t')
    if (c.length === 1) c = l.trim().split(/\s{2,}|,|;/)
    const g = (k) => (c[k] || '').trim()
    return { nombre: g(0), series: g(1), reps: g(2), peso: g(3), obs: g(4) }
  }).filter((e) => e.nombre)
}

// Editor tipo Excel de una lista de ejercicios (entrada en calor y cada bloque)
function ListaEjercicios({ ejercicios, onChange }) {
  const gridRef = useRef(null)
  const dragRef = useRef(null)
  const [dragI, setDragI] = useState(null)
  const [overI, setOverI] = useState(null)
  const [pegar, setPegar] = useState(false)
  const [pegarTxt, setPegarTxt] = useState('')

  const setEj = (i, k, v) => onChange(ejercicios.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)))
  const add = () => onChange([...ejercicios, emptyEj()])
  const dup = (i) => onChange([...ejercicios.slice(0, i + 1), { ...ejercicios[i] }, ...ejercicios.slice(i + 1)])
  const del = (i) => onChange(ejercicios.filter((_, idx) => idx !== i))

  // Enter (como en Excel): baja a la fila de abajo; si es la última, agrega una nueva.
  const onEnter = (ev, i) => {
    if (ev.key !== 'Enter') return
    ev.preventDefault()
    if (i === ejercicios.length - 1) add()
    requestAnimationFrame(() => {
      const inputs = gridRef.current?.querySelectorAll('.ejt-nombre')
      inputs?.[i + 1]?.focus()
    })
  }

  // Pegar desde Excel dentro de una celda: reemplaza desde esa fila hacia abajo
  const onPasteCell = (ev, i) => {
    const text = ev.clipboardData?.getData('text') || ''
    if (!/[\t\n]/.test(text)) return
    ev.preventDefault()
    const filas = parseFilas(text)
    if (filas.length) onChange([...ejercicios.slice(0, i), ...filas, ...ejercicios.slice(i + 1)])
  }
  const agregarPegado = () => {
    const filas = parseFilas(pegarTxt)
    if (filas.length) onChange([...ejercicios.filter((e) => (e.nombre || '').trim()), ...filas])
    setPegar(false); setPegarTxt('')
  }

  // Arrastrar filas para reordenar (agarrás del número #)
  const dDown = (e, i) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    dragRef.current = { from: i, to: i, pid: e.pointerId, el: e.currentTarget }
    setDragI(i); setOverI(i)
  }
  const dMove = (e) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pid) return
    e.preventDefault()
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const row = el && el.closest('[data-ri]')
    if (row) { const to = Number(row.getAttribute('data-ri')); d.to = to; setOverI(to) }
  }
  const dUp = (e) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pid) return
    e.preventDefault()
    try { d.el.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    const { from, to } = d
    dragRef.current = null; setDragI(null); setOverI(null)
    if (from !== to && to >= 0) {
      const arr = [...ejercicios]
      const [m] = arr.splice(from, 1)
      arr.splice(to, 0, m)
      onChange(arr)
    }
  }

  return (
    <div className="ejt">
      <div className="ejt-grid" ref={gridRef}>
        <div className="ejt-head">
          <span className="ejt-cn">#</span>
          <span>Ejercicio</span>
          <span>Series</span>
          <span>Reps</span>
          <span>Peso</span>
          <span>Obs.</span>
          <span />
        </div>
        {ejercicios.length === 0 ? (
          <div className="ejt-empty">Sin ejercicios todavía — tocá “+ ejercicio” o “📋 Pegar de Excel”.</div>
        ) : (
          ejercicios.map((e, i) => (
            <div key={i} data-ri={i} className={`ejt-row ${dragI === i ? 'dragging' : ''} ${overI === i && dragI !== null ? 'over' : ''}`}>
              <span
                className="ejt-cn ejt-grip"
                title="Arrastrar para mover"
                onPointerDown={(ev) => dDown(ev, i)}
                onPointerMove={dMove}
                onPointerUp={dUp}
                onPointerCancel={dUp}
              >{i + 1}</span>
              <input className="ejt-cell ejt-nombre" list="ejlib" value={e.nombre} onChange={(ev) => setEj(i, 'nombre', ev.target.value)} onKeyDown={(ev) => onEnter(ev, i)} onPaste={(ev) => onPasteCell(ev, i)} placeholder="Ejercicio" />
              <input className="ejt-cell ejt-c" inputMode="numeric" value={e.series} onChange={(ev) => setEj(i, 'series', ev.target.value)} placeholder="—" />
              <input className="ejt-cell ejt-c" value={e.reps} onChange={(ev) => setEj(i, 'reps', ev.target.value)} placeholder="—" />
              <input className="ejt-cell ejt-c" value={e.peso} onChange={(ev) => setEj(i, 'peso', ev.target.value)} placeholder="—" />
              <input className="ejt-cell ejt-obs" value={e.obs} onChange={(ev) => setEj(i, 'obs', ev.target.value)} placeholder="—" />
              <div className="ejt-acc">
                <button type="button" title="Duplicar" onClick={() => dup(i)}>⧉</button>
                <button type="button" title="Quitar" className="ejt-del" onClick={() => del(i)}>✕</button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="ejt-tools">
        <button type="button" className="btn-ghost btn-add-ej" onClick={add}>+ ejercicio</button>
        <button type="button" className="btn-ghost btn-add-ej" onClick={() => setPegar((v) => !v)}>📋 Pegar de Excel</button>
      </div>
      {pegar && (
        <div className="ejt-pegar">
          <p className="cal-sub" style={{ margin: '0 0 6px' }}>Copiá las filas de tu Excel (Ejercicio · Series · Reps · Peso · Obs) y pegalas acá:</p>
          <textarea value={pegarTxt} onChange={(e) => setPegarTxt(e.target.value)} placeholder={'Sentadilla\t4\t8\t80kg\tRIR 2\nPeso muerto\t3\t10'} />
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => { setPegar(false); setPegarTxt('') }}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={agregarPegado} disabled={!parseFilas(pegarTxt).length}>Agregar filas</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlanDia({ mes, mesLargo, semana, dia, item, onBack }) {
  const [diaActivo, setDiaActivo] = useState(dia)
  const [ec, setEc] = useState(clone(item?.ec))
  const [bloques, setBloques] = useState(
    item?.bloques?.length ? item.bloques.map((b) => ({ nombre: b.nombre || 'Bloque', ejercicios: clone(b.ejercicios) })) : defaultBloques(),
  )
  const [saveState, setSaveState] = useState('saved') // saving | saved | error
  const [cambiando, setCambiando] = useState(false)
  const [error, setError] = useState('')
  const [tv, setTv] = useState(false)
  const [lib, setLib] = useState([])
  const [copiar, setCopiar] = useState(null)
  const [plantillas, setPlantillas] = useState([])
  const [picker, setPicker] = useState(false)
  const [tplMsg, setTplMsg] = useState('')

  const firstRun = useRef(true)
  const dirtyRef = useRef(false)

  // Biblioteca de ejercicios ya usados (autocompletado dinámico)
  useEffect(() => {
    supabase.from('planificaciones').select('ec, bloques').then(({ data }) => {
      const set = new Set()
      ;(data || []).forEach((p) => {
        ;[...(p.ec || []), ...((p.bloques || []).flatMap((b) => b.ejercicios || []))].forEach((e) => {
          const n = (e.nombre || '').trim()
          if (n) set.add(n)
        })
      })
      setLib([...set].sort((a, b) => a.localeCompare(b)))
    })
  }, [])

  async function loadPlantillas() {
    const { data } = await supabase.from('plantillas_bloque').select('id, nombre, ejercicios').order('nombre')
    setPlantillas(data || [])
  }
  useEffect(() => { loadPlantillas() }, [])

  // --- Guardado ---
  async function guardarDia(d, ecData, bloquesData) {
    const payload = {
      mes, semana, dia: d,
      ec: limpiarEj(ecData),
      bloques: bloquesData.map((b) => ({ nombre: (b.nombre || 'Bloque').trim(), ejercicios: limpiarEj(b.ejercicios) })).filter((b) => b.ejercicios.length),
      updated_at: new Date().toISOString(),
    }
    const { error: err } = await supabase.from('planificaciones').upsert(payload, { onConflict: 'mes,semana,dia' })
    if (err) { setSaveState('error'); return false }
    setSaveState('saved'); dirtyRef.current = false
    return true
  }

  // Autoguardado (debounce) al cambiar ejercicios/bloques
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    dirtyRef.current = true
    setSaveState('saving')
    const t = setTimeout(() => { guardarDia(diaActivo, ec, bloques) }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ec, bloques])

  // Cambiar de día (pestañas): guarda el actual y carga el nuevo
  async function cambiarDia(d) {
    if (d === diaActivo || cambiando) return
    setCambiando(true)
    if (dirtyRef.current) await guardarDia(diaActivo, ec, bloques)
    const { data } = await supabase.from('planificaciones').select('ec, bloques').eq('mes', mes).eq('semana', semana).eq('dia', d).maybeSingle()
    firstRun.current = true
    setEc(clone(data?.ec))
    setBloques(data?.bloques?.length ? data.bloques.map((b) => ({ nombre: b.nombre || 'Bloque', ejercicios: clone(b.ejercicios) })) : defaultBloques())
    setDiaActivo(d)
    setSaveState('saved')
    setError('')
    setCambiando(false)
  }

  async function volver() {
    if (dirtyRef.current) await guardarDia(diaActivo, ec, bloques)
    onBack()
  }

  async function guardarPlantilla(b) {
    const ejercicios = limpiarEj(b.ejercicios)
    if (!ejercicios.length) { setTplMsg('Ese bloque no tiene ejercicios para guardar.'); return }
    const nombre = (b.nombre || 'Bloque').trim()
    const { error: err } = await supabase.from('plantillas_bloque').insert({ nombre, ejercicios })
    if (err) { setTplMsg('No se pudo guardar la plantilla.'); return }
    await loadPlantillas()
    setPicker(true)
    setTplMsg(`Guardaste “${nombre}” como plantilla ✓`)
  }
  function usarPlantilla(t) {
    setBloques((l) => [...l, { nombre: t.nombre, ejercicios: clone(t.ejercicios) }])
    setPicker(false); setTplMsg('')
  }
  async function borrarPlantilla(id) {
    await supabase.from('plantillas_bloque').delete().eq('id', id)
    await loadPlantillas()
  }

  const setBloque = (bi, patch) => setBloques((l) => l.map((b, idx) => (idx === bi ? { ...b, ...patch } : b)))
  const addBloque = () => setBloques((l) => [...l, { nombre: 'Bloque ' + (l.length + 1), ejercicios: [emptyEj()] }])
  const delBloque = (bi) => setBloques((l) => l.filter((_, idx) => idx !== bi))
  const moveBloque = (bi, d) => setBloques((l) => move(l, bi, d))

  async function traerDe(m, s, d) {
    const { data } = await supabase.from('planificaciones').select('ec, bloques').eq('mes', m).eq('semana', s).eq('dia', d).maybeSingle()
    if (!data || (!(data.ec || []).length && !(data.bloques || []).length)) {
      setError('Ese día está vacío — no hay nada para traer.')
      return
    }
    setEc(clone(data.ec))
    setBloques((data.bloques || []).map((b) => ({ nombre: b.nombre || 'Bloque', ejercicios: clone(b.ejercicios) })))
    setCopiar(null); setError('')
  }

  const totalEj = (ec || []).filter((e) => (e.nombre || '').trim()).length +
    bloques.reduce((s, b) => s + b.ejercicios.filter((e) => (e.nombre || '').trim()).length, 0)

  if (tv) {
    const secciones = [{ nombre: 'Entrada en calor', ejercicios: ec }, ...bloques].filter((s) => (s.ejercicios || []).some((e) => (e.nombre || '').trim()))
    return (
      <div className="plan-tv">
        <div className="plan-tv-head">
          <span>{mesLargo} · Semana {semana} · Día {diaActivo}</span>
          <button className="btn-ghost" onClick={() => setTv(false)}>Salir</button>
        </div>
        <div className="plan-tv-body">
          {secciones.length === 0 ? (
            <p className="muted">Todavía no hay ejercicios cargados.</p>
          ) : (
            secciones.map((s, i) => (
              <div key={i} className="plan-tv-bloque">
                <div className="plan-tv-bloque-tit">{s.nombre}</div>
                {s.ejercicios.filter((e) => (e.nombre || '').trim()).map((e, j) => (
                  <div key={j} className="plan-tv-ej">
                    <span className="plan-tv-ej-nombre">{e.nombre}</span>
                    <span className="plan-tv-ej-datos">{[e.series && e.series + ' series', e.reps, e.peso && e.peso].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const saveTxt = saveState === 'saving' ? 'Guardando…' : saveState === 'error' ? '⚠ Error al guardar' : 'Guardado ✓'

  return (
    <div className="plan-editor">
      <datalist id="ejlib">{lib.map((n) => <option key={n} value={n} />)}</datalist>

      <div className="section-head">
        <button className="btn-back" onClick={volver}>← Volver</button>
        <div className="section-head-actions">
          <button className="btn-ghost" onClick={() => setCopiar(copiar ? null : { mes, semana, dia: diaActivo })}>⧉ Copiar de…</button>
          <button className="btn-ghost" onClick={() => setTv(true)}>📺 Modo TV</button>
        </div>
      </div>
      <h1 className="section-title">Semana {semana}</h1>

      <div className="plan-dia-tabs">
        {[1, 2, 3, 4].map((d) => (
          <button key={d} className={`plan-dia-tab ${diaActivo === d ? 'on' : ''}`} onClick={() => cambiarDia(d)}>Día {d}</button>
        ))}
        <span className={`plan-save ${saveState}`}>{saveTxt}</span>
      </div>
      <p className="cal-sub">{mesLargo} · {totalEj} ejercicio{totalEj === 1 ? '' : 's'} · se guarda solo{lib.length ? ` · biblioteca: ${lib.length}` : ''}</p>

      {copiar && (
        <div className="plan-copiar">
          <span className="plan-copiar-tit">Traer ejercicios de otro día:</span>
          <div className="plan-copiar-row">
            <select value={copiar.mes} onChange={(e) => setCopiar({ ...copiar, mes: Number(e.target.value) })}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Mes {m}</option>)}
            </select>
            <select value={copiar.semana} onChange={(e) => setCopiar({ ...copiar, semana: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>Sem {s}</option>)}
            </select>
            <select value={copiar.dia} onChange={(e) => setCopiar({ ...copiar, dia: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((d) => <option key={d} value={d}>Día {d}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={() => traerDe(copiar.mes, copiar.semana, copiar.dia)}>Traer</button>
          </div>
          <p className="cal-sub" style={{ margin: 0 }}>Reemplaza lo que tengas cargado en este día.</p>
        </div>
      )}

      <div className="plan-bloque">
        <div className="plan-bloque-head">
          <span className="plan-bloque-tit">🔥 Entrada en calor</span>
        </div>
        <ListaEjercicios ejercicios={ec} onChange={setEc} />
      </div>

      {bloques.map((b, bi) => (
        <div key={bi} className="plan-bloque">
          <div className="plan-bloque-head">
            <input
              className="plan-bloque-nombre"
              value={b.nombre}
              onChange={(e) => setBloque(bi, { nombre: e.target.value })}
              placeholder={`Bloque ${bi + 1}`}
            />
            <div className="plan-bloque-acc">
              <button type="button" title="Subir bloque" onClick={() => moveBloque(bi, -1)} disabled={bi === 0}>↑</button>
              <button type="button" title="Bajar bloque" onClick={() => moveBloque(bi, 1)} disabled={bi === bloques.length - 1}>↓</button>
              <button type="button" title="Guardar como plantilla" onClick={() => guardarPlantilla(b)}>💾</button>
              <button type="button" className="btn-del-text" onClick={() => delBloque(bi)}>Quitar</button>
            </div>
          </div>
          <ListaEjercicios ejercicios={b.ejercicios} onChange={(nueva) => setBloque(bi, { ejercicios: nueva })} />
        </div>
      ))}

      <div className="plan-add-row">
        <button type="button" className="btn-ghost" onClick={addBloque}>+ Agregar bloque</button>
        <button type="button" className="btn-ghost" onClick={() => { setPicker((v) => !v); setTplMsg('') }}>📁 Desde plantilla</button>
      </div>

      {tplMsg && <p className="plan-ok">{tplMsg}</p>}

      {picker && (
        <div className="plan-copiar">
          <span className="plan-copiar-tit">Insertar un bloque guardado:</span>
          {plantillas.length === 0 ? (
            <p className="cal-sub" style={{ margin: 0 }}>Todavía no guardaste ninguna plantilla. Cargá los ejercicios de un bloque y tocá 💾.</p>
          ) : (
            <div className="tpl-list">
              {plantillas.map((t) => (
                <div key={t.id} className="tpl-row">
                  <button type="button" className="tpl-use" onClick={() => usarPlantilla(t)}>
                    <span className="tpl-nombre">{t.nombre}</span>
                    <span className="tpl-meta">{(t.ejercicios || []).length} ejercicio{(t.ejercicios || []).length === 1 ? '' : 's'} · insertar</span>
                  </button>
                  <button type="button" className="tpl-del" title="Borrar plantilla" onClick={() => borrarPlantilla(t.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="login-error">{error}</p>}
    </div>
  )
}
