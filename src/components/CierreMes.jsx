import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Recibe los números ya calculados por Pagos (misma fuente, no duplica lógica)
// y agrega el movimiento de alumnos del mes. Informe imprimible (window.print).
export default function CierreMes({ periodo, datos, onClose }) {
  const [ab, setAb] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('alumnos').select('fecha_alta, fecha_baja, estado')
      const altas = (data || []).filter((a) => (a.fecha_alta || '').startsWith(periodo)).length
      const bajas = (data || []).filter((a) => (a.fecha_baja || '').startsWith(periodo)).length
      const activos = (data || []).filter((a) => a.estado === 'activo').length
      setAb({ altas, bajas, activos })
    })()
  }, [periodo])

  const [y, m] = periodo.split('-')
  const mesLabel = `${MESES[Number(m) - 1]} ${y}`
  const cobrable = datos.deudaTotal
  const pct = datos.facturacion ? Math.round((datos.cobrado / datos.facturacion) * 100) : 0

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
            <div className="inf-tit">Cierre de mes</div>
          </div>
          <div className="inf-fecha">{mesLabel}</div>
        </div>

        <section className="inf-sec">
          <h3 className="inf-sec-tit">Ingresos</h3>
          <div className="inf-tabla">
            <Fila lbl="Facturación esperada" val={formatARS(datos.facturacion)} />
            <Fila lbl={`Cobrado (${pct}%)`} val={formatARS(datos.cobrado)} />
            <Fila lbl={`A cobrar · ${datos.deudoresN} alumno${datos.deudoresN === 1 ? '' : 's'}`} val={formatARS(cobrable)} />
          </div>
        </section>

        <section className="inf-sec">
          <h3 className="inf-sec-tit">Gastos</h3>
          <div className="inf-tabla">
            <Fila lbl="Gastos operativos" val={formatARS(datos.gastosManuales)} />
            <Fila lbl="Pago a profes (base)" val={formatARS(datos.totalProfes)} />
            <Fila lbl="Mediciones (Diego)" val={formatARS(datos.diegoTotal)} />
            <Fila lbl="Total gastos" val={formatARS(datos.totalGastos)} fuerte />
          </div>
        </section>

        <section className="inf-sec">
          <h3 className="inf-sec-tit">Resultado esperado</h3>
          <div className="cm-resultado">{formatARS(datos.resultado)}</div>
          <p className="inf-vacio" style={{ marginTop: 4 }}>Facturación esperada − gastos totales.</p>
        </section>

        <section className="inf-sec">
          <h3 className="inf-sec-tit">Movimiento de alumnos</h3>
          {!ab ? (
            <p className="inf-vacio">Calculando…</p>
          ) : (
            <div className="inf-tabla">
              <Fila lbl="Altas del mes" val={`+${ab.altas}`} />
              <Fila lbl="Bajas del mes" val={`−${ab.bajas}`} />
              <Fila lbl="Alumnos activos" val={ab.activos} fuerte />
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
