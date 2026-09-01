import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { MEDICION_MONTO, precioMensual } from '../lib/domain'
import { haceCuanto } from './Lesiones'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Documento de "Cierre del mes anterior" para el Inicio (admin).
// Trae por su cuenta toda la info del mes `periodo` ('YYYY-MM-01') y arma
// un resumen imprimible (window.print, reusa el layout .informe-*).
// No escribe nada: es solo lectura.
export default function CierreMesDoc({ periodo, onClose }) {
  const [d, setD] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [{ data: alumnos }, { data: pagos }, { data: gastos }, { data: profes }, { data: lesiones }] =
        await Promise.all([
          supabase
            .from('alumnos')
            .select('id, nombre, estado, fecha_alta, fecha_baja, medicion_nutricional, paga_directo_profe, ajuste_monto, planes(nombre, precio_mensual)'),
          supabase.from('pagos').select('alumno_id, monto, fecha_pago'),
          supabase.from('gastos').select('categoria, monto, descripcion').eq('periodo', periodo),
          supabase.from('profes').select('id, nombre, base_mensual, split_resto, personalizados, rol').eq('rol', 'profe').order('id'),
          supabase.from('lesiones').select('alumno_id, tipo, desde').is('hasta', null),
        ])
      setD({
        alumnos: alumnos || [],
        pagos: pagos || [],
        gastos: gastos || [],
        profes: profes || [],
        lesiones: lesiones || [],
      })
    })()
  }, [periodo])

  const ym = (periodo || '').slice(0, 7) // 'YYYY-MM'
  const [y, m] = ym.split('-')
  const mesLabel = `${MESES[Number(m) - 1]} ${y}`
  const enMes = (iso) => (iso || '').slice(0, 7) === ym

  if (!d) {
    return (
      <div className="informe-screen">
        <div className="informe-toolbar">
          <button className="btn-back" onClick={onClose}>← Volver</button>
        </div>
        <p className="muted">Armando el cierre de {mesLabel}…</p>
      </div>
    )
  }

  const activos = d.alumnos.filter((a) => a.estado === 'activo')
  const activosPeak = activos.filter((a) => !a.paga_directo_profe)
  const online = activos.filter((a) => (a.planes?.nombre || '') === 'Online')
  const altas = d.alumnos.filter((a) => enMes(a.fecha_alta)).map((a) => a.nombre).sort()
  const bajas = d.alumnos.filter((a) => enMes(a.fecha_baja)).map((a) => a.nombre).sort()

  const facturado = d.pagos
    .filter((p) => enMes(p.fecha_pago))
    .reduce((s, p) => s + Number(p.monto || 0), 0)

  const gastosOper = d.gastos.reduce((s, g) => s + Number(g.monto || 0), 0)
  const profesPago = d.profes
    .map((p) => ({ nombre: p.nombre, monto: Number(p.base_mensual || 0) }))
    .filter((x) => x.monto > 0)
  const totalProfes = profesPago.reduce((s, x) => s + x.monto, 0)
  const conMedicion = activosPeak.filter((a) => a.medicion_nutricional).length
  const diegoTotal = conMedicion * MEDICION_MONTO
  const totalGastos = gastosOper + totalProfes + diegoTotal

  // 40% de los personalizados repartidos que recibe Peak (de los acuerdos).
  let personalizadosPeak = 0
  d.profes.forEach((p) => {
    const pctPeak = 100 - Number(p.split_resto ?? 60)
    ;(p.personalizados || []).forEach((x) => {
      if (x.al100) return
      personalizadosPeak += Math.round((Number(x.monto || 0) * pctPeak) / 100)
    })
  })

  // Resultado = plata cobrada + 40% de personalizados − gastos → mitad para cada uno
  const resultado = facturado + personalizadosPeak - totalGastos
  const parteCada = Math.round(resultado / 2)

  // Quién quedó por pagar ese mes: activos que le pagan a Peak, sin pago
  // registrado en el mes, y que ya estaban de alta a esa altura (no los que
  // entraron después del mes que se cierra).
  const pagadoMes = new Set(d.pagos.filter((p) => enMes(p.fecha_pago)).map((p) => p.alumno_id))
  const deudores = activosPeak
    .filter((a) => !pagadoMes.has(a.id))
    .filter((a) => !a.fecha_alta || a.fecha_alta.slice(0, 7) <= ym)
    .map((a) => ({ nombre: a.nombre, monto: precioMensual(a) }))
    .sort((x, y) => x.nombre.localeCompare(y.nombre))
  const pendienteTotal = deudores.reduce((s, x) => s + x.monto, 0)

  const nombrePorId = new Map(d.alumnos.map((a) => [a.id, a.nombre]))
  const lesionados = (d.lesiones || [])
    .map((l) => ({ nombre: nombrePorId.get(l.alumno_id) || '—', tipo: l.tipo, desde: l.desde }))
    .sort((a, b) => (a.desde < b.desde ? -1 : 1))

  return (
    <div className="informe-screen">
      <div className="informe-toolbar">
        <button className="btn-back" onClick={onClose}>← Volver</button>
        <button className="btn-primary" onClick={() => window.print()}>🖨 Descargar PDF</button>
      </div>

      <div className="informe-hoja" id="informe-print">
        <div className="inf-head">
          <div>
            <div className="inf-marca">PEAK PERFORMANCE</div>
            <div className="inf-tit">Cierre del mes</div>
          </div>
          <div className="inf-fecha">{mesLabel}</div>
        </div>

        {/* ---- Alumnos ---- */}
        <section className="inf-sec">
          <h3 className="inf-sec-tit">Alumnos</h3>
          <div className="inf-tabla">
            <Fila lbl="Activos del centro" val={activosPeak.length} fuerte />
            <Fila lbl="Alumnos online (plan Online)" val={online.length} />
          </div>

          <p className="cm-subtit">Altas del mes ({altas.length})</p>
          {altas.length === 0 ? (
            <p className="inf-vacio">Sin altas este mes.</p>
          ) : (
            <div className="cm-checklist">
              {altas.map((n, i) => <CheckItem key={`a${i}`} nombre={n} />)}
            </div>
          )}

          <p className="cm-subtit">Bajas del mes ({bajas.length})</p>
          {bajas.length === 0 ? (
            <p className="inf-vacio">Sin bajas este mes.</p>
          ) : (
            <div className="cm-checklist">
              {bajas.map((n, i) => <CheckItem key={`b${i}`} nombre={n} />)}
            </div>
          )}
        </section>

        {/* ---- Cuentas del mes ---- */}
        <section className="inf-sec">
          <h3 className="inf-sec-tit">Cuentas del mes</h3>
          <div className="inf-tabla">
            <Fila lbl="Total facturado" val={formatARS(facturado)} />
            {personalizadosPeak > 0 && (
              <Fila lbl="Personalizados (40% Peak)" val={`+ ${formatARS(personalizadosPeak)}`} />
            )}
            <Fila lbl="Total gastos" val={`− ${formatARS(totalGastos)}`} />
          </div>
          <div className="cm-resultado" style={resultado < 0 ? { color: '#d4443a', marginTop: 10 } : { marginTop: 10 }}>
            {formatARS(resultado)}
          </div>
          <p className="inf-vacio" style={{ marginTop: 2, marginBottom: 14 }}>
            Resultado del mes ({personalizadosPeak > 0 ? 'facturado + personalizados − gastos' : 'facturado − gastos'}).
          </p>
          <div className="inf-tabla">
            <Fila lbl="Para Nico" val={formatARS(parteCada)} fuerte />
            <Fila lbl="Para Eze" val={formatARS(parteCada)} fuerte />
          </div>
          <p className="cm-names">A Nico y a Eze les toca {formatARS(parteCada)} a cada uno (la mitad del resultado).</p>
        </section>

        {/* ---- Quedan por pagar ---- */}
        <section className="inf-sec">
          <h3 className="inf-sec-tit">Quedan por pagar ({deudores.length})</h3>
          {deudores.length === 0 ? (
            <p className="inf-vacio">Todos pagaron este mes. 🎉</p>
          ) : (
            <>
              <div className="cm-checklist cm-checklist-1">
                {deudores.map((x, i) => (
                  <CheckItem key={`d${i}`} nombre={x.nombre} monto={x.monto} />
                ))}
              </div>
              <div className="inf-tabla" style={{ marginTop: 6 }}>
                <Fila lbl="Total pendiente" val={formatARS(pendienteTotal)} fuerte />
              </div>
            </>
          )}
        </section>

        {/* ---- Detalle de gastos ---- */}
        <section className="inf-sec">
          <h3 className="inf-sec-tit">Detalle de gastos</h3>
          <div className="inf-tabla">
            {d.gastos.length === 0 ? (
              <Fila lbl="Gastos operativos" val={formatARS(0)} />
            ) : (
              <>
                {d.gastos.map((g, i) => (
                  <Fila
                    key={i}
                    lbl={g.categoria + (g.descripcion ? ` · ${g.descripcion}` : '')}
                    val={formatARS(Number(g.monto || 0))}
                  />
                ))}
                <Fila lbl="Subtotal gastos operativos" val={formatARS(gastosOper)} />
              </>
            )}
          </div>

          <p className="cm-subtit">Pago a profes</p>
          <div className="inf-tabla">
            {profesPago.length === 0 ? (
              <p className="inf-vacio">Sin pagos a profes cargados.</p>
            ) : (
              <>
                {profesPago.map((p, i) => (
                  <Fila key={i} lbl={p.nombre} val={formatARS(p.monto)} />
                ))}
                <Fila lbl="Subtotal profes" val={formatARS(totalProfes)} />
              </>
            )}
          </div>

          <div className="inf-tabla" style={{ marginTop: 4 }}>
            <Fila lbl={`Mediciones (Diego) · ${conMedicion} alumno${conMedicion === 1 ? '' : 's'}`} val={formatARS(diegoTotal)} />
            <Fila lbl="Total gastos" val={formatARS(totalGastos)} fuerte />
          </div>
        </section>

        {/* ---- Lesionados ---- */}
        <section className="inf-sec">
          <h3 className="inf-sec-tit">Lesionados (estado actual)</h3>
          {lesionados.length === 0 ? (
            <p className="inf-vacio">Nadie lesionado ahora.</p>
          ) : (
            <div className="inf-tabla">
              {lesionados.map((l, i) => (
                <Fila key={i} lbl={`${l.nombre} · ${l.tipo}`} val={haceCuanto(l.desde)} />
              ))}
            </div>
          )}
        </section>

        <div className="inf-pie">Peak Performance · Cierre de {mesLabel}</div>
      </div>
    </div>
  )
}

function Fila({ lbl, val, fuerte }) {
  return (
    <div className="inf-fila">
      <span className="inf-fila-lbl" style={fuerte ? { fontWeight: 800 } : null}>{lbl}</span>
      <span className="inf-fila-val" style={fuerte ? { fontWeight: 800 } : null}>{val}</span>
    </div>
  )
}

function CheckItem({ nombre, monto }) {
  const [on, setOn] = useState(false)
  return (
    <button type="button" className={'cm-check' + (on ? ' on' : '')} onClick={() => setOn((v) => !v)}>
      <span className="cm-check-box">{on ? '✓' : ''}</span>
      <span className="cm-check-lbl">{nombre}</span>
      {monto != null && <span className="cm-check-monto">{formatARS(monto)}</span>}
    </button>
  )
}
