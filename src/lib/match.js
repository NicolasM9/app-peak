// Matcheo difuso de nombres escritos a mano contra la lista de alumnos.
// Se usa en la carga rápida de pagos y en la carga masiva de teléfonos.

export function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Devuelve el alumno que mejor matchea un texto, o null si nada supera el umbral.
export function matchAlumno(token, alumnos) {
  const t = norm(token)
  if (!t) return null
  let best = null
  let bestScore = 0
  for (const a of alumnos) {
    const n = norm(a.nombre)
    let score = 0
    if (n === t) score = 100
    else if (n.startsWith(t) || t.startsWith(n)) score = 80
    else if (n.includes(t)) score = 60
    else {
      const tw = t.split(' ')
      const nw = n.split(' ')
      const common = tw.filter((w) => w.length > 2 && nw.some((x) => x.startsWith(w))).length
      if (common) score = 30 + common * 15
    }
    if (score > bestScore) {
      bestScore = score
      best = a
    }
  }
  return bestScore >= 30 ? best : null
}
