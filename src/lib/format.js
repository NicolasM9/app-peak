// Formatea números como pesos argentinos: 75000 -> "$75.000"
export function formatARS(n) {
  const v = Math.round(Number(n) || 0)
  return '$' + v.toLocaleString('es-AR')
}

// Formatea una fecha ISO (YYYY-MM-DD) a DD/MM/YYYY
export function formatFecha(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}
