import { supabase } from './supabase'

// Conexión Horas ↔ Calendario: el "profe de un turno Peak" es lo compartido.
// Modelo de un solo profe por turno (que es como está cargado hoy).

const HORAS_TURNO = 1.5
// Horarios que existen como turno en la grilla de Horas (mapean a sesiones Peak).
// El sábado 10:00 no está en la grilla de Horas, así que no sincroniza para ese lado.
const SLOTS_HORAS = ['08:00', '09:30', '16:45', '18:00', '19:30']

function masMin(hhmm, min) {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + min
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

// Horas → Calendario: deja el profe de la sesión Peak de ese día/horario.
// profeId = null quita el profe de la sesión (la sesión se mantiene).
export async function syncCalendarioDesdeHoras(dia, horario, profeId) {
  const { data: ses } = await supabase
    .from('sesiones')
    .select('id')
    .eq('dia', dia)
    .eq('tipo', 'peak')
    .eq('hora_inicio', horario)
    .limit(1)
  if (ses && ses.length) {
    await supabase.from('sesiones').update({ profe_id: profeId || null }).eq('id', ses[0].id)
  } else if (profeId) {
    await supabase.from('sesiones').insert({
      dia,
      hora_inicio: horario,
      hora_fin: masMin(horario, 90),
      titulo: 'Peak',
      tipo: 'peak',
      profe_id: profeId,
      visibilidad: 'todos',
    })
  }
}

// Calendario → Horas: deja el turno de ese día/horario con ese profe (uno solo).
// profeId = null borra el turno de esa celda.
export async function syncHorasDesdeCalendario(dia, hora_inicio, profeId) {
  const horario = (hora_inicio || '').slice(0, 5)
  if (!SLOTS_HORAS.includes(horario)) return
  await supabase.from('turnos').delete().eq('dia', dia).eq('horario', horario)
  if (profeId) await supabase.from('turnos').insert({ profe_id: Number(profeId), dia, horario, horas: HORAS_TURNO })
}
