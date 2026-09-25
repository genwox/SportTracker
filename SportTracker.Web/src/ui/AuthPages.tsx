import { useState } from 'react'
import type { FormEvent } from 'react'
import { IonContent, IonPage } from '@ionic/react'
import { Link, useHistory, useLocation } from 'react-router-dom'
import { login, register } from '../api/authService'
import { V5Button, V5Card } from './index'
import './auth.css'

function safeReturnUrl(search: string): string {
  const value = new URLSearchParams(search).get('returnUrl')
  return value?.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/tabs/today'
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const history = useHistory()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isRegister = mode === 'register'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = isRegister ? await register(email, password) : await login(email, password)
      if (result) setError(result)
      else history.replace(safeReturnUrl(location.search))
    } finally {
      setBusy(false)
    }
  }

  return <IonPage><IonContent>
    <main className="v5-auth-page">
      <header className="v5-auth-heading">
        <h1>{isRegister ? 'Créer ton compte' : 'SportTracker'}</h1>
        <p>{isRegister ? 'Bienvenue sur SportTracker' : 'Ton entraînement, à ton rythme.'}</p>
      </header>
      <V5Card className="v5-auth-card">
        <section className="v5-auth-intro">
          <h2>{isRegister ? 'Une place pour tous tes efforts.' : 'Heureux de te retrouver.'}</h2>
          <p>{isRegister ? 'Enregistre tes séances et construis tes carnets.' : 'Connecte-toi pour retrouver tes séances et tes progrès.'}</p>
        </section>
        {error && <div className="v5-auth-error" role="alert">{error}</div>}
        <form onSubmit={submit} className="v5-auth-form">
          <label htmlFor="auth-email">Adresse e-mail</label>
          <input id="auth-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="toi@exemple.fr" />
          <label htmlFor="auth-password">Mot de passe</label>
          <input id="auth-password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 6 : undefined} required value={password} onChange={event => setPassword(event.target.value)} placeholder={isRegister ? '6 caractères minimum' : '••••••••'} />
          <V5Button type="submit" disabled={busy}>{busy ? (isRegister ? 'Création…' : 'Connexion…') : (isRegister ? 'Créer mon compte' : 'Se connecter')}</V5Button>
        </form>
        <p className="v5-auth-switch">{isRegister ? 'Tu as déjà un compte ?' : 'Pas encore de compte ?'}</p>
        <Link className="v5-button v5-button--secondary" to={isRegister ? '/login' : '/register'}>{isRegister ? 'Se connecter' : 'Créer un compte'}</Link>
      </V5Card>
    </main>
  </IonContent></IonPage>
}

export function LoginPage() { return <AuthPage mode="login" /> }
export function RegisterPage() { return <AuthPage mode="register" /> }
