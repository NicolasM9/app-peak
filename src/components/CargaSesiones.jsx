import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const DIAS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
]
const AM = ['08:00', '09:30']
const PM = ['16:45', '18:15', '19:45']
const SLOTS_STD = [...AM, ...PM]
const LUNVIE = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const TIPOS = [
  { value: 'peak', label: 'Peak (grupal)' },
  { value: 'personalizado', label: 'Personalizado' },
  { value: 'grupo', label: 'Grupo con alumnos' },
  { value: 'filmacion', label: 'Filmación / contenido' },
  { value: 'otro', label: 'Otro' },
]

// Suma minutos a un "HH:MM" y devuelve "HH:MM"
function masMin(hhmm, min) {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + min
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

// Carga rápida: crea muchas sesiones de la semana tipo (días × horarios) de una.
export default function CargaSesiones({ profes = [], onDone, onCancel }) {
  const [titulo, setTitulo] = useState('Peak')
  const [tipo, setTipo] = useState('peak')
  const [profeId, setProfeId] = useState('')
  const [dur, setDur] = useState(90)
  const [dias, setDias] = useState([])
  const [horarios, setHorarios] = useState([])
  const [custom, setCustom] = useState('')
  const [extraSlots, setExtraSlots] = useState([])
  const [existentes, setExistentes] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hechos, setHechos] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('sesiones').select('dia, hora_inicio, titulo')
      setExistentes(
        new Set((data || []).map((r) => `${r.dia}|${(r.hora_inicio || '').slice(0, 5)}|${(r.titulo || '').trim().toLowerCase()}`)),
      )
    })()
  }, [])

  const slots = useMemo(() => [...SLOTS_STD, ...extraSlots], [extraSlots])

  function toggle(list, setList, v) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  }
  function toggleGrupoEn(list, setList, grupo) {
    const all = grupo.every((k) => list.includes(k))
    setList(all ? list.filter((k) => !grupo.includes(k)) : [...new Set([...list, ...grupo])])
  }
  function agregarCustom() {
    const v = custom.slice(0, 5)
    if (!/^\d{2}:\d{2}$/.test(v)) return
    if (!slots.includes(v)) setExtraSlots((e) => [...e, v])
    if (!horarios.includes(v)) setHorarios((h) => [...h, v])
    setCustom('')
  }

  const combos = useMemo(() => {
    const t = titulo.trim().toLowerCase()
    const arr = []
    for (const d of dias) for (const h of horarios) arr.push({ dia: d, hora: h, dup: existentes.has(`${d}|${h}|${t}`) })
    return arr
  }, [dias, horarios, existentes, titulo])
  const aCrear = combos.filter((c) => !c.dup)
  const dupes = combos.length - aCrear.length

  async function crear() {
    setError('')
    if (!titulo.trim()) { setError('Ponele un título (ej: Peak).'); return }
    if (aCrear.length === 0) { setError('Elegí días y horarios (los que ya existen se saltean).'); return }
    setSaving(true)
    const rows = aCrear.map((c) => ({
      dia: c.dia,
      hora_inicio: c.hora,
      hora_fin: masMin(c.hora, Number(dur) || 90),
      titulo: titulo.trim(),
      tipo,
      profe_id: profeId ? Number(profeId) : null,
      visibilidad: 'todos',
    }))
    const { error } = await supabase.from('sesiones').insert(rows)
    setSaving(false)
    if (error) { setError('No se pudo crear: ' + error.message); return }
    // Sumamos las recién creadas para que "Cargar más" no las duplique
    const t = titulo.trim().toLowerCase()
    setExistentes((prev) => {
      const n = new Set(prev)
      aCrear.forEach((c) => n.add(`${c.dia}|${c.hora}|${t}`))
      return n
    })
    setHechos(rows.length)
  }

  if (hechos !== null) {
    return (
      <div className="form-screen">
        <div className="section-head">
          <button className="btn-back" onClick={onCancel}>← Volver</button>
          <h1 className="section-title">Carga rápida de sesiones</h1>
        </div>
        <div className="carga-ok">
          <p>✅ Se crearon <b>{hechos}</b> sesion{hechos === 1 ? '' : 'es'}.</p>
          <div className="form-actions">
            <button className="btn-ghost" onClick={() => { setHechos(null); setDias([]); setHorarios([]) }}>Cargar más</button>
            <button className="btn-primary" onClick={onDone}>Listo</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="form-screen">
      <div className="section-head">
        <button className="btn-back" onClick={onCancel}>← Volver</button>
        <h1 className="section-title">Carga rápida de sesiones</h1>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Título</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Peak" />
        </label>
        <label className="field">
          <span>Tipo (color)</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Profe a cargo</span>
          <select value={profeId} onChange={(e) => setProfeId(e.target.value)}>
            <option value="">— Sin asignar —</option>
            {profes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Duración (min)</span>
          <input type="number" min="15" step="15" value={dur} onChange={(e) => setDur(e.target.value)} />
        </label>
      </div>

      <div className="ht-carga-grupo">
        <span className="ht-carga-lbl">Horarios</span>
        <div className="ht-chips">
          <button type="button" className={`ht-pick ${AM.every((k) => horarios.includes(k)) ? 'on' : ''}`} onClick={() => toggleGrupoEn(horarios, setHorarios, AM)}>AM</button>
          <button type="button" className={`ht-pick ${PM.every((k) => horarios.includes(k)) ? 'on' : ''}`} onClick={() => toggleGrupoEn(horarios, setHorarios, PM)}>PM</button>
          <span className="ht-sep" />
          {slots.map((s) => (
            <button key={s} type="button" className={`ht-pick ${horarios.includes(s) ? 'on' : ''}`} onClick={() => toggle(horarios, setHorarios, s)}>{s}</button>
          ))}
          <input className="cs-custom" type="time" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button type="button" className="ht-pick" onClick={agregarCustom} disabled={!custom}>+ agregar</button>
        </div>
      </div>

      <div className="ht-carga-grupo">
        <span className="ht-carga-lbl">Días</span>
        <div className="ht-chips">
          <button type="button" className={`ht-pick ${dias.length === DIAS.length ? 'on' : ''}`} onClick={() => setDias(dias.length === DIAS.length ? [] : DIAS.map((d) => d.key))}>Todos</button>
          <button type="button" className={`ht-pick ${LUNVIE.every((k) => dias.includes(k)) ? 'on' : ''}`} onClick={() => toggleGrupoEn(dias, setDias, LUNVIE)}>Lun-Vie</button>
          <span className="ht-sep" />
          {DIAS.map((d) => (
            <button key={d.key} type="button" className={`ht-pick ${dias.includes(d.key) ? 'on' : ''}`} onClick={() => toggle(dias, setDias, d.key)}>{d.label}</button>
          ))}
        </div>
      </div>

      <p className="cal-sub">
        {aCrear.length > 0
          ? `Se van a crear ${aCrear.length} sesion${aCrear.length === 1 ? '' : 'es'}`
          : 'Elegí horarios y días'}
        {dupes > 0 ? ` · ${dupes} ya existen (se saltean)` : ''}
      </p>

      {error && <p className="login-error">{error}</p>}
      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" onClick={crear} disabled={saving || aCrear.length === 0}>
          {saving ? 'Creando…' : `Crear ${aCrear.length} sesión${aCrear.length === 1 ? '' : 'es'}`}
        </button>
      </div>
    </div>
  )
}
