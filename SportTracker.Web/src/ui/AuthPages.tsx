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
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isRegister = mode === 'register'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (isRegister && password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
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
      <header className="v5-auth-heading"><h1>SportTracker</h1><p>{isRegister ? 'Crée ton espace en 30 secondes.' : 'Ton entraînement, à ton rythme.'}</p></header>
      <nav className="v5-auth-tabs" aria-label="Compte">
        <Link className={!isRegister ? 'is-active' : ''} aria-current={!isRegister ? 'page' : undefined} to="/login">Connexion</Link>
        <Link className={isRegister ? 'is-active' : ''} aria-current={isRegister ? 'page' : undefined} to="/register">Créer un compte</Link>
      </nav>
      <V5Card className="v5-auth-card">
        <section className="v5-auth-intro">
          <h2 className="v5-display">{isRegister ? 'Commençons.' : 'Heureux de te retrouver.'}</h2>
          <p>{isRegister ? 'Un compte suffit pour tes séances muscu et cardio.' : 'Reprends tes séances, tes carnets et tes records.'}</p>
        </section>
        {error && <div className="v5-auth-error" role="alert">{error}</div>}
        <form id="v5-auth-form" onSubmit={submit} className="v5-auth-form">
          <label htmlFor="auth-email">Adresse e-mail</label>
          <input id="auth-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="toi@exemple.fr" />
          <label htmlFor="auth-password">Mot de passe</label>
          <input id="auth-password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 6 : undefined} required value={password} onChange={event => setPassword(event.target.value)} placeholder={isRegister ? '6 caractères minimum' : '••••••••'} />
          {isRegister && <><label htmlFor="auth-confirmation">Confirmation</label><input id="auth-confirmation" type="password" autoComplete="new-password" minLength={6} required value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="••••••••" /></>}
        </form>
      </V5Card>
      <V5Button type="submit" form="v5-auth-form" disabled={busy}>{busy ? (isRegister ? 'Création…' : 'Connexion…') : (isRegister ? 'Créer mon compte' : 'Se connecter')}</V5Button>
      {isRegister ? <p className="v5-auth-note">En continuant, tes données restent sur ton espace.</p> : <Link className="v5-button v5-button--secondary v5-auth-switch" to="/register">Créer un compte</Link>}
    </main>
  </IonContent></IonPage>
}

export function LoginPage() { return <AuthPage mode="login" /> }
export function RegisterPage() { return <AuthPage mode="register" /> }

export function NotFoundPage() {
  return <IonPage><IonContent><main className="v5-not-found">
    <h1>Page introuvable</h1>
    <p>Cette page n’existe plus ou a été déplacée. Tes séances et tes carnets sont intacts.</p>
    <Link className="v5-button" to="/tabs/today">Revenir à l’accueil</Link>
  </main></IonContent></IonPage>
}
