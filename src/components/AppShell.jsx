import { useState } from 'react'
import Sidebar from './Sidebar'
import Inicio from './Inicio'
import MiPeak from './MiPeak'
import Alumnos from './Alumnos'
import Calendario from './Calendario'
import Planificaciones from './Planificaciones'
import Horas from './Horas'
import Pagos from './Pagos'
import Acuerdos from './Acuerdos'
import Estadisticas from './Estadisticas'
import MiAcuerdo from './MiAcuerdo'
import MisPersonalizados from './MisPersonalizados'
import AgendaMes from './AgendaMes'
import Redes from './Redes'
import NM from './NM'
import { Menu } from 'lucide-react'

const TITULOS = {
  inicio: 'Inicio', calendario: 'Calendario', alumnos: 'Alumnos',
  planificaciones: 'Planificaciones', horas: 'Horas', pagos: 'Pagos',
  estadisticas: 'Estadísticas', acuerdos: 'Acuerdos profes',
  miacuerdo: 'Mi acuerdo', personalizados: 'Personalizados', agenda: 'Agenda', redes: 'Redes', nm: 'NM',
}
const ADMIN_SECC = new Set(['alumnos', 'pagos', 'acuerdos', 'estadisticas', 'agenda', 'redes'])
const PROFE_SECC = new Set(['miacuerdo', 'personalizados'])
const NICO_SECC = new Set(['nm'])

export default function AppShell({ profe, user }) {
  const nombre = profe?.nombre || user?.email
  const esAdmin = profe?.rol === 'admin'
  const esNico = esAdmin && (profe?.nombre || '').toLowerCase().startsWith('nico')
  const [seccion, setSeccion] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)
  const [alumnoTarget, setAlumnoTarget] = useState(null)

  let sec = seccion
  if (ADMIN_SECC.has(sec) && !esAdmin) sec = 'inicio'
  if (PROFE_SECC.has(sec) && esAdmin) sec = 'inicio'
  if (NICO_SECC.has(sec) && !esNico) sec = 'inicio'

  function ir(id) {
    setSeccion(id)
    setMenuOpen(false)
  }

  function irAlAlumno(id) {
    setAlumnoTarget(id)
    setSeccion('alumnos')
    setMenuOpen(false)
  }

  function contenido() {
    switch (sec) {
      case 'alumnos':
        return <Alumnos autor={nombre} abrir={alumnoTarget} onAbierto={() => setAlumnoTarget(null)} />
      case 'pagos':
        return <Pagos irAlAlumno={irAlAlumno} />
      case 'calendario':
        return <Calendario esAdmin={esAdmin} />

      case 'planificaciones':
        return <Planificaciones />

      case 'horas':
        return <Horas esAdmin={esAdmin} />

      case 'acuerdos':
        return <Acuerdos />

      case 'estadisticas':
        return <Estadisticas onIrAlumno={irAlAlumno} />

      case 'miacuerdo':
        return <MiAcuerdo profe={profe} />

      case 'personalizados':
        return <MisPersonalizados profe={profe} />

      case 'agenda':
        return <AgendaMes />

      case 'redes':
        return <Redes />

      case 'nm':
        return <NM />

      default:
        return esAdmin ? <Inicio onIrAlumno={irAlAlumno} onIr={ir} /> : <MiPeak profe={profe} />
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        seccion={sec}
        onIr={ir}
        esAdmin={esAdmin}
        esNico={esNico}
        nombre={nombre}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="app-content">
        <div className="topbar">
          <button className="hamb" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
          <span>{TITULOS[sec]}</span>
        </div>
        <main className="app-main">{contenido()}</main>
      </div>
    </div>
  )
}
