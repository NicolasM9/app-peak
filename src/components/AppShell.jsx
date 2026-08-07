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
import Placeholder from './Placeholder'
import { Menu } from 'lucide-react'

const TITULOS = {
  inicio: 'Inicio', calendario: 'Calendario', alumnos: 'Alumnos',
  planificaciones: 'Planificaciones', horas: 'Horas', pagos: 'Pagos',
  estadisticas: 'Estadísticas', acuerdos: 'Acuerdos profes',
}
const ADMIN_SECC = new Set(['alumnos', 'pagos', 'acuerdos', 'estadisticas'])

export default function AppShell({ profe, user }) {
  const nombre = profe?.nombre || user?.email
  const esAdmin = profe?.rol === 'admin'
  const [seccion, setSeccion] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)
  const [alumnoTarget, setAlumnoTarget] = useState(null)

  let sec = seccion
  if (ADMIN_SECC.has(sec) && !esAdmin) sec = 'inicio'

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

      default:
        return esAdmin ? <Inicio onIrAlumno={irAlAlumno} /> : <MiPeak profe={profe} />
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        seccion={sec}
        onIr={ir}
        esAdmin={esAdmin}
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
