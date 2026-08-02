import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Home from './components/Home'

export default function App() {
  const [session, setSession] = useState(null)
  const [profe, setProfe] = useState(null)
  const [ready, setReady] = useState(false)

  // Sesión actual + escuchar cambios (entrar / salir)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Traer el perfil de staff (nombre + rol) del usuario logueado
  useEffect(() => {
    if (!session?.user) {
      setProfe(null)
      return
    }
    supabase
      .from('profes')
      .select('nombre, rol')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfe(data))
  }, [session])

  if (!ready) {
    return <div className="loading-screen">Cargando…</div>
  }

  if (!session) {
    return <Login />
  }

  return <Home profe={profe} user={session.user} />
}
