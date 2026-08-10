import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyEj = () => ({ nombre: '', series: '', reps: '' })
const clone = (arr) => (arr || []).map((e) => ({ nombre: e.nombre || '', series: e.series || '', reps: e.reps || '' }))
const limpiarEj = (arr) =>
  (arr || []).filter((e) => (e.nombre || '').trim()).map((e) => ({
    nombre: e.nombre.trim(),
    series: (e.series || '').toString().trim(),
    reps: (e.reps || '').toString().trim(),
  }))
const move = (list, i, dir) => {
  const j = i + dir
  if (j < 0 || j >= list.length) return list
  const c = [...list]
  ;[c[i], c[j]] = [c[j], c[i]]
  return c
}

// Editor reutilizable de una lista de ejercicios (para la entrada en calor y cada bloque)
function ListaEjercicios({ ejercicios, onChange }) {
  const setEj = (i, k, v) => onChange(ejercicios.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)))
  const add = () => onChange([...ejercicios, emptyEj()])
  const dup = (i) => onChange([...ejercicios.slice(0, i + 1), { ...ejercicios[i] }, ...ejercicios.slice(i + 1)])
  const del = (i) => onChange(ejercicios.filter((_, idx) => idx !== i))
  const mv = (i, d) => onChange(move(ejercicios, i, d))

  return (
    <div className="ejp-lista">
      {ejercicios.map((e, i) => (
        <div key={i} className="ejp-row">
          <input
            className="ejp-nombre"
            list="ejlib"
            value={e.nombre}
            onChange={(ev) => setEj(i, 'nombre', ev.target.value)}
            placeholder="Ejercicio"
          />
          <div className="ejp-meta">
            <input className="ejp-num" inputMode="numeric" value={e.series} onChange={(ev) => setEj(i, 'series', ev.target.value)} placeholder="Series" />
            <span className="ejp-x">×</span>
            <input className="ejp-num" value={e.reps} onChange={(ev) => setEj(i, 'reps', ev.target.value)} placeholder="Reps" />
            <div className="ejp-acc">
              <button type="button" title="Subir" onClick={() => mv(i, -1)} disabled={i === 0}>↑</button>
              <button type="button" title="Bajar" onClick={() => mv(i, 1)} disabled={i === ejercicios.length - 1}>↓</button>
              <button type="button" title="Duplicar" onClick={() => dup(i)}>⧉</button>
              <button type="button" title="Quitar" className="ejp-del" onClick={() => del(i)}>✕</button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn-ghost btn-add-ej" onClick={add}>+ ejercicio</button>
    </div>
  )
}

export default function PlanDia({ mes, mesLargo, semana, dia, item, onBack }) {
  const [ec, setEc] = useState(clone(item?.ec))
  const [bloques, setBloques] = useState(
    item?.bloques?.length
      ? item.bloques.map((b) => ({ nombre: b.nombre || 'Bloque', ejercicios: clone(b.ejercicios) }))
      : [
          { nombre: 'Bloque 1', ejercicios: [emptyEj()] },
          { nombre: 'Bloque 2', ejercicios: [] },
        ],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tv, setTv] = useState(false)
  const [lib, setLib] = useState([])
  const [copiar, setCopiar] = useState(null) // { mes, semana, dia } | null
  const [plantillas, setPlantillas] = useState([])
  const [picker, setPicker] = useState(false)
  const [tplMsg, setTplMsg] = useState('')

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

  // Plantillas de bloque guardadas (reutilizables)
  async function loadPlantillas() {
    const { data } = await supabase.from('plantillas_bloque').select('id, nombre, ejercicios').order('nombre')
    setPlantillas(data || [])
  }
  useEffect(() => { loadPlantillas() }, [])

  async function guardarPlantilla(b) {
    const ejercicios = limpiarEj(b.ejercicios)
    if (!ejercicios.length) { setTplMsg('Ese bloque no tiene ejercicios para guardar.'); return }
    const nombre = (b.nombre || 'Bloque').trim()
    const { error } = await supabase.from('plantillas_bloque').insert({ nombre, ejercicios })
    if (error) { setTplMsg('No se pudo guardar la plantilla.'); return }
    await loadPlantillas()
    setPicker(true)
    setTplMsg(`Guardaste “${nombre}” como plantilla ✓`)
  }
  function usarPlantilla(t) {
    setBloques((l) => [...l, { nombre: t.nombre, ejercicios: clone(t.ejercicios) }])
    setPicker(false)
    setTplMsg('')
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
    setCopiar(null)
    setError('')
  }

  async function guardar() {
    setSaving(true)
    setError('')
    const payload = {
      mes,
      semana,
      dia,
      ec: limpiarEj(ec),
      bloques: bloques.map((b) => ({ nombre: (b.nombre || 'Bloque').trim(), ejercicios: limpiarEj(b.ejercicios) })).filter((b) => b.ejercicios.length),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('planificaciones').upsert(payload, { onConflict: 'mes,semana,dia' })
    setSaving(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    onBack()
  }

  const totalEj = (ec || []).filter((e) => (e.nombre || '').trim()).length +
    bloques.reduce((s, b) => s + b.ejercicios.filter((e) => (e.nombre || '').trim()).length, 0)

  if (tv) {
    const secciones = [{ nombre: 'Entrada en calor', ejercicios: ec }, ...bloques].filter((s) => (s.ejercicios || []).some((e) => (e.nombre || '').trim()))
    return (
      <div className="plan-tv">
        <div className="plan-tv-head">
          <span>{mesLargo} · Semana {semana} · Día {dia}</span>
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
                    <span className="plan-tv-ej-datos">{[e.series && e.series + ' series', e.reps].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="plan-editor">
      <datalist id="ejlib">{lib.map((n) => <option key={n} value={n} />)}</datalist>

      <div className="section-head">
        <button className="btn-back" onClick={onBack}>← Volver</button>
        <div className="section-head-actions">
          <button className="btn-ghost" onClick={() => setCopiar(copiar ? null : { mes, semana, dia })}>⧉ Copiar de…</button>
          <button className="btn-ghost" onClick={() => setTv(true)}>📺 Modo TV</button>
        </div>
      </div>
      <h1 className="section-title">Semana {semana} · Día {dia}</h1>
      <p className="cal-sub">{mesLargo} · {totalEj} ejercicio{totalEj === 1 ? '' : 's'}{lib.length ? ` · biblioteca: ${lib.length}` : ''}</p>

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
          <p className="cal-sub" style={{ margin: 0 }}>Reemplaza lo que tengas cargado acá (después lo editás y guardás).</p>
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
      <div className="form-actions" style={{ marginTop: 18 }}>
        <button type="button" className="btn-ghost" onClick={onBack}>Cancelar</button>
        <button type="button" className="btn-primary" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar rutina'}
        </button>
      </div>
    </div>
  )
}
