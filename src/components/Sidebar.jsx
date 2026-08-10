import { supabase } from '../lib/supabase'
import Logo from './Logo'
import {
  Home,
  Calendar,
  CalendarDays,
  Users,
  ClipboardList,
  Clock,
  Wallet,
  FileText,
  BarChart3,
  UserPlus,
  Lock,
  LogOut,
  X,
} from 'lucide-react'

const ITEMS = [
  { id: 'inicio', label: 'Inicio', labelProfe: 'Mi Peak', Icon: Home },
  { id: 'calendario', label: 'Calendario', Icon: Calendar },
  { id: 'alumnos', label: 'Alumnos', Icon: Users, admin: true },
  { id: 'planificaciones', label: 'Planificaciones', Icon: ClipboardList },
  { id: 'horas', label: 'Horas', Icon: Clock },
  { id: 'miacuerdo', label: 'Mi acuerdo', Icon: FileText, soloProfe: true },
  { id: 'personalizados', label: 'Personalizados', Icon: UserPlus, soloProfe: true },
]

const ADMIN_ITEMS = [
  { id: 'agenda', label: 'Agenda', Icon: CalendarDays },
  { id: 'pagos', label: 'Pagos', Icon: Wallet },
  { id: 'estadisticas', label: 'Estadísticas', Icon: BarChart3 },
  { id: 'acuerdos', label: 'Acuerdos profes', Icon: FileText },
]

export default function Sidebar({ seccion, onIr, esAdmin, nombre, open, onClose }) {
  return (
    <>
      <div className={`sidebar-overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo size={30} />
          <div style={{ lineHeight: 1.15 }}>
            <div className="sb-name">Peak Performance</div>
            <div className="sb-sub">Gestión interna</div>
          </div>
          <button className="sb-close" onClick={onClose} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {ITEMS.filter((it) => (!it.admin || esAdmin) && (!it.soloProfe || !esAdmin)).map((it) => {
            const Icon = it.Icon
            const label = !esAdmin && it.labelProfe ? it.labelProfe : it.label
            return (
              <button
                key={it.id}
                className={`nav-item ${seccion === it.id ? 'on' : ''}`}
                onClick={() => onIr(it.id)}
              >
                <Icon size={18} /> {label}
              </button>
            )
          })}

          {esAdmin && (
            <>
              <div className="nav-divider">Solo admins</div>
              {ADMIN_ITEMS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`nav-item ${seccion === id ? 'on' : ''}`}
                  onClick={() => onIr(id)}
                >
                  <Icon size={18} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                  <Lock size={13} className="nav-lock" />
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="sb-avatar">{(nombre || '?').charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-uname">{nombre}</div>
            <div className="sb-urole">{esAdmin ? 'Admin' : 'Profe'}</div>
          </div>
          <button className="sb-logout" onClick={() => supabase.auth.signOut()} aria-label="Salir">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  )
}
