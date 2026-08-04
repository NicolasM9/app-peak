import { useState } from 'react'
import Sidebar from './Sidebar'
import Inicio from './Inicio'
import Alumnos from './Alumnos'
import Calendario from './Calendario'
import Pagos from './Pagos'
import Placeholder from './Placeholder'
import { Menu } from 'lucide-react'

const TITULOS = {
  inicio: 'Inicio', calendario: 'Calendario', alumnos: 'Alumnos',
  planificaciones: 'Planificaciones', horas: 'Horas', pagos: 'Pagos', acuerdos: 'Acuerdos profes',
}
const ADMIN_SECC = new Set(['pagos', 'acuerdos'])

export default function AppShell({ profe, user }) {
  const nombre = profe?.nombre || user?.email
  const esAdmin = profe?.rol === 'admin'
  const [seccion, setSeccion] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)

  let sec = seccion
  if (ADMIN_SECC.has(sec) && !esAdmin) sec = 'inicio'

  function ir(id) {
    setSeccion(id)
    setMenuOpen(false)
  }

  function contenido() {
    switch (sec) {
      case 'alumnos':
        return <Alumnos autor={nombre} />
      case 'pagos':
        return <Pagos />
      case 'calendario':
        return <Calendario esAdmin={esAdmin} />

      case 'planificaciones':
        return (
          <Placeholder
            titulo="Planificaciones"
            desc="Acá vas a planificar con los profes, guardar el historial y generar la imagen para la tele."
          />
        )
      case 'horas':
        return (
          <Placeholder
            titulo="Horas"
            desc="Horas trabajadas de cada profe (con las rotaciones) y las vacaciones."
          />
        )
      case 'acuerdos':
        return (
          <Placeholder
            titulo="Acuerdos profes"
            desc="El acuerdo de cada profe: personalizados, pagos, horas y qué incluye."
          />
        )
      default:
        return <Inicio />
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
