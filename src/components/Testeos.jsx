import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import { hoyISO } from '../lib/domain'

// Tests predefinidos, agrupados por categoría (con su unidad por defecto)
const GRUPOS = {
  fuerza: {
    label: 'Fuerza',
    unidad: 'kg',
    tests: ['Sentadilla', 'Press plano', 'Peso muerto', 'Dominadas', 'Subida al podio', 'Press militar'],
  },
  salto: {
    label: 'Salto',
    unidad: 'cm',
    tests: ['CMJ', 'Squat jump', 'Salto largo 2 piernas', 'Salto largo 1 pierna'],
  },
}
const UNIDADES = ['kg', 'cm', 'reps', 'seg', 'm']
const CAT_INFO = {
  fuerza: { label: 'Fuerza', tint: 'rgba(26,79,163,0.18)', text: '#8fb4f0' },
  salto: { label: 'Salto', tint: 'rgba(234,179,8,0.16)', text: '#f2cd5c' },
  otro: { label: 'Otro', tint: 'rgba(148,163,184,0.16)', text: '#c3cad6' },
}

export default function Testeos({ alumnoId }) {
  const [testeos, setTesteos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [fecha, setFecha] = useState(hoyISO())
  const [sel, setSel] = useState('') // 'fuerza|Sentadilla' | 'salto|CMJ' | 'otro'
  const [testCustom, setTestCustom] = useState('')
  const [unidad, setUnidad] = useState('kg')
  const [valor, setValor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('testeos')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('fecha', { ascending: false })
    setTesteos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [alumnoId])

  const esOtro = sel === 'otro'

  function elegir(v) {
    setSel(v)
    if (v === 'otro') {
      setUnidad('kg')
    } else if (v) {
      const cat = v.split('|')[0]
      setUnidad(GRUPOS[cat].unidad)
    }
  }

  function cancelar() {
    setShowForm(false)
    setError('')
    setSel('')
    setTestCustom('')
    setUnidad('kg')
    setValor('')
    setFecha(hoyISO())
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!sel) {
      setError('Elegí un test.')
      return
    }
    const test = esOtro ? testCustom.trim() : sel.split('|')[1]
    const categoria = esOtro ? 'otro' : sel.split('|')[0]
    if (!test) {
      setError('Escribí el nombre del test.')
      return
    }
    if (valor === '') {
      setError('Cargá el valor.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('testeos').insert({
      alumno_id: alumnoId,
      fecha,
      categoria,
      test,
      valor: Number(valor),
      unidad,
    })
    setSaving(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    cancelar()
    await load()
  }

  async function borrar(id) {
    await supabase.from('testeos').delete().eq('id', id)
    setConfirmando(null)
    await load()
  }

  return (
    <>
      <div className="section-subhead">
        <h2>Testeos</h2>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Cargar
          </button>
        )}
      </div>

      {showForm && (
        <form className="form" onSubmit={guardar}>
          <div className="field-row">
            <label className="field">
              <span>Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
            <label className="field">
              <span>Test</span>
              <select value={sel} onChange={(e) => elegir(e.target.value)}>
                <option value="">— Elegí un test —</option>
                <optgroup label="Fuerza (kg)">
                  {GRUPOS.fuerza.tests.map((t) => (
                    <option key={t} value={'fuerza|' + t}>{t}</option>
                  ))}
                </optgroup>
                <optgroup label="Salto (cm)">
                  {GRUPOS.salto.tests.map((t) => (
                    <option key={t} value={'salto|' + t}>{t}</option>
                  ))}
                </optgroup>
                <option value="otro">Otro (personalizado)…</option>
              </select>
            </label>
          </div>

          {esOtro && (
            <label className="field">
              <span>Nombre del test</span>
              <input
                value={testCustom}
                onChange={(e) => setTestCustom(e.target.value)}
                placeholder="Ej: Plancha, Flexibilidad…"
              />
            </label>
          )}

          <div className="field-row">
            <label className="field">
              <span>Valor</span>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ej: 100"
              />
            </label>
            <label className="field">
              <span>Unidad</span>
              <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={cancelar}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : testeos.length === 0 ? (
        <p className="muted">Todavía no hay testeos cargados.</p>
      ) : (
        <ul className="testeo-list">
          {testeos.map((t) => {
            const cat = CAT_INFO[t.categoria] || CAT_INFO.otro
            return (
              <li key={t.id} className="testeo-row">
                <div className="testeo-info">
                  <span className="testeo-test">{t.test}</span>
                  <span className="testeo-sub">
                    {formatFecha(t.fecha)}
                    <span className="testeo-chip" style={{ background: cat.tint, color: cat.text }}>
                      {cat.label}
                    </span>
                  </span>
                </div>
                <span className="testeo-valor">
                  <b>{t.valor}</b> {t.unidad}
                </span>
                {confirmando === t.id ? (
                  <div className="pago-confirm">
                    <span>¿Borrar?</span>
                    <button className="confirm-si" onClick={() => borrar(t.id)}>Sí</button>
                    <button className="confirm-no" onClick={() => setConfirmando(null)}>No</button>
                  </div>
                ) : (
                  <button className="pago-del" aria-label="Borrar testeo" onClick={() => setConfirmando(t.id)}>
                    ✕
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
