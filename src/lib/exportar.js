import { supabase } from './supabase'
import { hoyISO } from './domain'

// Descarga un respaldo .xlsx con hojas de Alumnos, Pagos y Gastos.
// La librería xlsx se carga sólo al llamar esta función (import dinámico).
export async function exportarRespaldo() {
  const XLSX = await import('xlsx')
  const [{ data: alumnos }, { data: pagos }, { data: gastos }] = await Promise.all([
    supabase
      .from('alumnos')
      .select('id, nombre, telefono, fecha_nacimiento, deporte, estado, fecha_alta, fecha_baja, medicion_nutricional, paga_directo_profe, ajuste_monto, planes(nombre, precio_mensual)')
      .order('nombre'),
    supabase.from('pagos').select('alumno_id, monto, fecha_pago, vencimiento, metodo'),
    supabase.from('gastos').select('periodo, categoria, monto, descripcion').order('periodo'),
  ])

  const nombreAl = new Map((alumnos || []).map((a) => [a.id, a.nombre]))

  const alRows = (alumnos || []).map((a) => ({
    Nombre: a.nombre,
    Teléfono: a.telefono || '',
    'Fecha nac.': a.fecha_nacimiento || '',
    Deporte: a.deporte || '',
    Estado: a.estado,
    Plan: a.planes?.nombre || '',
    'Precio plan': a.planes?.precio_mensual || '',
    Ajuste: a.ajuste_monto || '',
    Medición: a.medicion_nutricional ? 'Sí' : '',
    'Directo al profe': a.paga_directo_profe ? 'Sí' : '',
    'Fecha alta': a.fecha_alta || '',
    'Fecha baja': a.fecha_baja || '',
  }))

  const pagRows = (pagos || []).map((p) => ({
    Alumno: nombreAl.get(p.alumno_id) || p.alumno_id,
    Monto: p.monto,
    'Fecha pago': p.fecha_pago || '',
    Vencimiento: p.vencimiento || '',
    Método: p.metodo || '',
  }))

  const gasRows = (gastos || []).map((g) => ({
    Período: g.periodo,
    Categoría: g.categoria,
    Monto: g.monto,
    Detalle: g.descripcion || '',
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alRows), 'Alumnos')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pagRows), 'Pagos')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gasRows), 'Gastos')
  XLSX.writeFile(wb, `respaldo-peak-${hoyISO()}.xlsx`)
}
