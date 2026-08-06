import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Logo from './Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('No pudimos entrar. Revisá el email y la contraseña.')
    }
    // Si entra bien, App detecta la sesión y cambia de pantalla solo.
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <Logo size={78} />
        <h1 className="brand-title">
          Peak
          <br />
          Performance
        </h1>
        <p className="brand-sub">Gestión interna</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="tu@email.com"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {error && <p className="login-error">{error}</p>}
        <p className="build-note">Uso exclusivo del staff</p>
      </div>
    </div>
  )
}
