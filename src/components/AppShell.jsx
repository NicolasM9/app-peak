import { useState } from 'react'
import Sidebar from './Sidebar'
import Inicio from './Inicio'
import Alumnos from './Alumnos'
import Pagos from './Pagos'
import Placeholder from './Placeholder'
import { Menu } from 'lucide-react'

const SECCIONES = {
  inicio: { titulo: 'Inicio', admin: false, render: () => <Inicio /> },
  calendario: {
    titulo: 'Calendario',
    admin: false,
    render: () => (
      <Placeholder
        titulo="Calendario"
        desc="Acá va a estar el calendario del staff. Lo armamos en el próximo paso; vas a poder adjuntar tu Excel."
      />
    ),
  },
  alumnos: { titulo: 'Alumnos', admin: false, render: () => <Alumnos /> },
  planificaciones: {
    titulo: 'Planificaciones',
    admin: false,
    render: () => (
      <Placeholder
        titulo="Planificaciones"
        desc="Acá vas a planificar con los profes, guardar el historial y generar la imagen para la tele."
      />
    ),
  },
  horas: {
    titulo: 'Horas',
    admin: false,
    render: () => (
      <Placeholder
        titulo="Horas"
        desc="Horas trabajadas de cada profe (con las rotaciones) y las vacaciones."
      />
    ),
  },
  pagos: { titulo: 'Pagos', admin: true, render: () => <Pagos /> },
  acuerdos: {
    titulo: 'Acuerdos profes',
    admin: true,
    render: () => (
      <Placeholder
        titulo="Acuerdos profes"
        desc="El acuerdo de cada profe: personalizados, pagos, horas y qué incluye."
      />
    ),
  },
}

export default function AppShell({ profe, user }) {
  const nombre = profe?.nombre || user?.email
  const esAdmin = profe?.rol === 'admin'
  const [seccion, setSeccion] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)

  let actual = SECCIONES[seccion] || SECCIONES.inicio
  if (actual.admin && !esAdmin) actual = SECCIONES.inicio

  function ir(id) {
    setSeccion(id)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <Sidebar
        seccion={seccion}
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
          <span>{actual.titulo}</span>
        </div>
        <main className="app-main">{actual.render()}</main>
      </div>
    </div>
  )
}
