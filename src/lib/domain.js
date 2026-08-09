// Lógica de negocio compartida (precios y estados de pago)

export const MEDICION_MONTO = 20000

// Precio mensual = plan + ajuste + medición (si corresponde)
export function precioMensual(a) {
  const base = a.planes?.precio_mensual || 0
  const ajuste = a.ajuste_monto || 0
  const med = a.medicion_nutricional ? MEDICION_MONTO : 0
  return base + ajuste + med
}

// Lo que cobra un profe por mes: base + personalizados
// (100% los marcados al100; el resto al split_resto% que le queda al profe)
export function totalAcuerdo(p) {
  const base = Number(p.base_mensual || 0)
  const split = Number(p.split_resto ?? 60)
  const pers = (p.personalizados || []).reduce((s, x) => {
    const m = Number(x.monto || 0)
    return s + (x.al100 ? m : Math.round((m * split) / 100))
  }, 0)
  return base + pers
}

// Estado de un pago según la fecha de hoy
export function estadoPago(pago, today = new Date()) {
  if (pago.fecha_pago) return 'al_dia'
  const venc = new Date(pago.vencimiento + 'T23:59:59')
  return today <= venc ? 'por_vencer' : 'vencido'
}

// Estado "actual" de un alumno a partir de sus pagos
export function estadoAlumno(pagos, today = new Date()) {
  if (!pagos || pagos.length === 0) return 'sin_pagos'
  const pendientes = pagos.filter((p) => !p.fecha_pago)
  if (pendientes.some((p) => estadoPago(p, today) === 'vencido')) return 'vencido'
  if (pendientes.some((p) => estadoPago(p, today) === 'por_vencer')) return 'por_vencer'
  return 'al_dia'
}

// Estado del MES ACTUAL (modelo virtual, igual que Pagos/Inicio): ¿pagó este mes?
// Si pagó -> al_dia; si no, según la fecha de hoy vs el vencimiento del 6.
export function estadoMesActual(pagos, today = new Date()) {
  const y = today.getFullYear()
  const m = today.getMonth()
  const pagoEsteMes = (pagos || []).some((p) => {
    if (!p.fecha_pago) return false
    const d = new Date(p.fecha_pago)
    return d.getFullYear() === y && d.getMonth() === m
  })
  if (pagoEsteMes) return 'al_dia'
  return estadoPago({ vencimiento: vencimientoPorDefecto(today), fecha_pago: null }, today)
}

export const ESTADO_INFO = {
  al_dia: { label: 'Pagado', dot: '#4caf50', tint: 'rgba(76,175,80,0.16)', text: '#86d98f' },
  por_vencer: { label: 'Por vencer', dot: '#eab308', tint: 'rgba(234,179,8,0.16)', text: '#f2cd5c' },
  vencido: { label: 'Vencido', dot: '#ef4444', tint: 'rgba(239,68,68,0.16)', text: '#f4a0a0' },
  sin_pagos: { label: 'Sin pagos', dot: '#64748b', tint: 'rgba(148,163,184,0.16)', text: '#c3cad6' },
}

export const METODO_LABEL = { transferencia: 'Transferencia', efectivo: 'Efectivo' }

// Día 6 del mes actual (YYYY-MM-DD): vencimiento por defecto (se abona del 1 al 6)
export function vencimientoPorDefecto(today = new Date()) {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-06`
}

// Hoy en formato YYYY-MM-DD
export function hoyISO(today = new Date()) {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Normaliza un teléfono argentino al formato que usa WhatsApp: 54 9 <área><número>
export function waPhone(tel) {
  let d = (tel || '').replace(/\D/g, '')
  if (!d) return ''
  d = d.replace(/^0+/, '') // saca ceros iniciales
  if (d.startsWith('54')) d = d.slice(2) // saca el código de país si ya venía
  if (d.startsWith('9')) d = d.slice(1) // saca el 9 de celular si ya venía
  return '549' + d
}

// Arma el link de WhatsApp con el mensaje ya escrito. '' si no hay teléfono.
export function waLink(tel, mensaje) {
  const p = waPhone(tel)
  if (!p) return ''
  return `https://wa.me/${p}?text=${encodeURIComponent(mensaje)}`
}
