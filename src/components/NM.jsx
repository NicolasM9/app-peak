import { useState } from 'react'
import { CalendarRange, Users, Wallet, FolderOpen, ChevronRight } from 'lucide-react'
import NMContenido from './NMContenido'

const CARDS = [
  { id: 'contenido', titulo: 'Calendario de contenido', desc: 'Qué subir cada día de la semana', Icon: CalendarRange, color: '#7c3aed', activo: true },
  { id: 'alumnos', titulo: 'Alumnos online', desc: 'Pagos, progreso, informes y comparativas', Icon: Users, color: '#1a4fa3', activo: false },
  { id: 'ingresos', titulo: 'Hacoaj y sueldo', desc: 'Tus ingresos personales', Icon: Wallet, color: '#0891b2', activo: false },
  { id: 'archivos', titulo: 'Archivos', desc: 'Lesiones, partidos, planificación macro', Icon: FolderOpen, color: '#c2410c', activo: false },
]

export default function NM() {
  const [view, setView] = useState('home')

  if (view === 'contenido') return <NMContenido onBack={() => setView('home')} />

  return (
    <div className="nm">
      <h1 className="section-title">NM</h1>
      <p className="cal-sub">Tu espacio privado. Nada de esto se cruza con Peak ni con los pagos.</p>

      <div className="nm-grid">
        {CARDS.map((c) => {
          const Icon = c.Icon
          return (
            <button
              key={c.id}
              className={`nm-card ${c.activo ? '' : 'soon'}`}
              style={{ '--nm-c': c.color }}
              onClick={() => c.activo && setView(c.id)}
              disabled={!c.activo}
            >
              <span className="nm-card-ic"><Icon size={24} /></span>
              <span className="nm-card-body">
                <span className="nm-card-tit">{c.titulo}</span>
                <span className="nm-card-desc">{c.desc}</span>
              </span>
              {c.activo ? <ChevronRight size={18} className="nm-card-arrow" /> : <span className="nm-soon">pronto</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
