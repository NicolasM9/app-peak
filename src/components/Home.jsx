import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Logo from './Logo'
import Alumnos from './Alumnos'
import Cobros from './Cobros'

export default function Home({ profe, user }) {
  const nombre = profe?.nombre || user?.email
  const esAdmin = profe?.rol === 'admin'
  const [tab, setTab] = useState('alumnos')

  return (
    <div className="app-shell">
      <header className="home-header">
        <div className="home-brand">
          <Logo size={26} />
          <span>Peak Performance</span>
        </div>
        <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
          Salir
        </button>
      </header>

      <main className="app-main">
        {!esAdmin ? (
          <div className="home-main">
            <h1 className="home-hello">Hola, {nombre}</h1>
            {!profe && (
              <p className="home-warn">
                Tu usuario entró bien, pero todavía no está vinculado a un perfil de staff.
              </p>
            )}
            <p className="home-note">
              Tu panel de profe llega en la Fase 2 (calendario y tus horarios).
            </p>
          </div>
        ) : tab === 'alumnos' ? (
          <Alumnos />
        ) : (
          <Cobros />
        )}
      </main>

      {esAdmin && (
        <nav className="tabbar">
          <button className={tab === 'alumnos' ? 'active' : ''} onClick={() => setTab('alumnos')}>
            Alumnos
          </button>
          <button className={tab === 'cobros' ? 'active' : ''} onClick={() => setTab('cobros')}>
            Cobros
          </button>
        </nav>
      )}
    </div>
  )
}
