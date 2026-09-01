import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'

// Editor de precios de los planes (admin). Escribe en la tabla `planes`
// (RLS: solo admin). Al cambiar acá, se actualiza al toque la facturación,
// los cobros del mes y la ficha de cada alumno. Los pagos ya registrados
// guardan su monto histórico, así que NO se tocan.

function unidad(nombre) {
  const n = (nombre || '').toLowerCase()
  if (n.includes('día') || n.includes('dia')) return '/día'
  if (n.includes('semanal')) return '/semana'
  return '/mes'
}

export default function PreciosPlanes({ onClose }) {
  const [planes, setPlanes] = useState(null)
  const [precios, setPrecios] = useState({}) // id -> string
  const [estado, setEstado] = useState('') // '' | 'guardando' | 'ok' | 'error'

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('planes')
        .select('id, nombre, precio_mensual, frecuencia_max')
        .order('id')
      setPlanes(data || [])
      const p = {}
      ;(data || []).forEach((x) => { p[x.id] = String(x.precio_mensual ?? '') })
      setPrecios(p)
    })()
  }, [])

  const { principales, personalizados } = useMemo(() => {
    const list = planes || []
    return {
      principales: list.filter((p) => !/^personalizado/i.test(p.nombre || '')),
      personalizados: list.filter((p) => /^personalizado/i.test(p.nombre || '')),
    }
  }, [planes])

  const hayCambios = (planes || []).some(
    (p) => Number(precios[p.id]) !== Number(p.precio_mensual),
  )

  function setPrecio(id, v) {
    // Solo dígitos (evita comas/puntos que rompan el número)
    setPrecios((s) => ({ ...s, [id]: v.replace(/[^\d]/g, '') }))
    setEstado('')
  }

  async function guardar() {
    const cambios = (planes || []).filter(
      (p) => Number(precios[p.id]) !== Number(p.precio_mensual),
    )
    if (cambios.length === 0) return
    // Validar
    for (const p of cambios) {
      const val = Number(precios[p.id])
      if (!Number.isFinite(val) || val < 0) {
        alert('Precio inválido en "' + p.nombre + '". Poné solo números.')
        return
      }
    }
    setEstado('guardando')
    try {
      for (const p of cambios) {
        const { error } = await supabase
          .from('planes')
          .update({ precio_mensual: Number(precios[p.id]) })
          .eq('id', p.id)
        if (error) throw error
      }
      setPlanes((list) =>
        list.map((p) => ({ ...p, precio_mensual: Number(precios[p.id]) })),
      )
      setEstado('ok')
    } catch (e) {
      setEstado('error')
      alert('No se pudo guardar: ' + (e?.message || e))
    }
  }

  function Fila(p) {
    const cambiado = Number(precios[p.id]) !== Number(p.precio_mensual)
    return (
      <div className={'precio-row' + (cambiado ? ' precio-row-dirty' : '')} key={p.id}>
        <div className="precio-info">
          <div className="precio-nombre">{p.nombre}</div>
          <div className="precio-actual">Actual: {formatARS(p.precio_mensual)}</div>
        </div>
        <label className="precio-input">
          <span className="precio-signo">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={precios[p.id] ?? ''}
            onChange={(e) => setPrecio(p.id, e.target.value)}
          />
          <span className="precio-unidad">{unidad(p.nombre)}</span>
        </label>
      </div>
    )
  }

  return (
    <div className="form-screen">
      <div className="section-head">
        <button className="btn-back" onClick={onClose}>← Volver</button>
        <h1 className="section-title">Precios de planes</h1>
      </div>
      <p className="cal-sub" style={{ marginTop: -4 }}>
        Cambiá el precio de cada plan. Se aplica al toque en la facturación, los cobros del mes
        y la ficha de cada alumno. Los pagos ya registrados <b>no</b> se tocan.
      </p>

      {planes === null ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          <div className="pk-card">
            <div className="card-title">Planes del centro</div>
            {principales.map((p) => Fila(p))}
          </div>

          {personalizados.length > 0 && (
            <div className="pk-card" style={{ marginTop: 14 }}>
              <div className="card-title">Personalizados</div>
              {personalizados.map((p) => Fila(p))}
            </div>
          )}

          <div className="precio-guardar">
            <button
              className="btn-primary"
              onClick={guardar}
              disabled={!hayCambios || estado === 'guardando'}
            >
              {estado === 'guardando' ? 'Guardando…' : 'Guardar precios'}
            </button>
            {estado === 'ok' && <span className="precio-msg precio-ok">Guardado ✓</span>}
            {estado === 'error' && <span className="precio-msg precio-err">Error al guardar</span>}
            {hayCambios && estado !== 'guardando' && estado !== 'ok' && (
              <span className="precio-msg muted">Hay cambios sin guardar</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
