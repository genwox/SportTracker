import { useState } from 'react'
import { IonContent, IonList, IonPage, useIonRouter } from '@ionic/react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { checkmarkCircleOutline, helpCircleOutline } from 'ionicons/icons'
import { login, register } from '../api/authService'
import { apiRequest } from '../api/client'
import { getToken } from '../api/tokenStore'
import { setWeeklyGoal } from '../features/today/weeklyGoal'
import { V6Button, V6InputItem, V6Item, V6List, V6Segment, V6StickyAction, V6Toggle } from './v6'
import { V6SessionRow } from './v6Plan'
import { V6Notice, V6StatePage, V6StatusPill } from './v6States'
import './auth.css'

/* V6 · 01 Connexion, 02 Inscription (segment, inset fields at 16 px, « Rester connecté » toggle, sticky action) and 20 Page introuvable. */

function safeReturnUrl(search: string): string {
  const value = new URLSearchParams(search).get('returnUrl')
  return value?.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/tabs/today'
}

type Mode = 'login' | 'register'
const modes = [{ value: 'login', label: 'Connexion' }, { value: 'register', label: 'Créer un compte' }] as const
const goals = [2, 3, 4, 5].map(value => ({ value: String(value), label: `${value} séances` }))

function AuthPage({ mode }: { mode: Mode }) {
  const router = useIonRouter()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [remember, setRemember] = useState(true)
  const [goal, setGoal] = useState('4')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mismatch, setMismatch] = useState(false)
  const isRegister = mode === 'register'
  // The segment swaps the two pages in place and keeps where to go after signing in.
  const switchTo = (next: Mode) => { if (next !== mode) router.push(`/${next}${location.search}`, 'none', 'replace') }

  async function submit() {
    if (busy) return
    if (!email.trim() || !password) { setError(isRegister ? 'Indique ton adresse e-mail et un mot de passe.' : 'Indique ton adresse e-mail et ton mot de passe.'); return }
    if (isRegister && password !== confirmation) { setMismatch(true); setError(null); return }
    setBusy(true)
    setError(null)
    setMismatch(false)
    try {
      const result = isRegister ? await register(email, password) : await login(email, password, remember)
      if (result) { setError(result); return }
      if (isRegister) await setWeeklyGoal(Number(goal))
      router.push(safeReturnUrl(location.search), 'root', 'replace')
    } finally {
      setBusy(false)
    }
  }

  return <IonPage className="auth-page-shell">
    <IonContent fullscreen>
      <main className="auth-page">
        <header className="auth-brand">
          <span className="auth-brand__logo" aria-hidden="true"><img src="/icons/021-goal.svg" alt="" /></span>
          <div><h1>SportTracker</h1><p>{isRegister ? 'Crée ton espace en 30 secondes.' : 'Ton entraînement, à ton rythme.'}</p></div>
        </header>
        <V6Segment label="Compte" value={mode} options={modes} onChange={switchTo} />
        <form className="auth-card" onSubmit={event => { event.preventDefault(); void submit() }} noValidate>
          <h2>{isRegister ? 'Commençons.' : 'Heureux de te retrouver.'}</h2>
          <p>{isRegister ? 'Un compte suffit pour tes séances muscu et cardio.' : 'Reprends tes séances, tes carnets et tes records.'}</p>
          <IonList inset lines="inset" className="v6-list auth-fields">
            <V6InputItem label="Adresse e-mail" type="email" inputmode="email" autocomplete="username" autocapitalize="off" enterkeyhint="next"
              value={email} onChange={setEmail} placeholder="toi@exemple.fr" />
            <V6InputItem label="Mot de passe" type="password" autocomplete={isRegister ? 'new-password' : 'current-password'} enterkeyhint={isRegister ? 'next' : 'go'}
              value={password} onChange={setPassword} placeholder="••••••••" minlength={isRegister ? 6 : undefined} clearInput={false} clearOnEdit={false}
              helper={isRegister ? '6 caractères minimum' : undefined} />
            {isRegister && <V6InputItem label="Confirmation" type="password" autocomplete="new-password" enterkeyhint="go" value={confirmation}
              onChange={value => { setConfirmation(value); setMismatch(false) }} placeholder="••••••••" clearInput={false} clearOnEdit={false}
              error={mismatch ? 'Les mots de passe ne correspondent pas.' : null} />}
          </IonList>
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
        {error && <V6Notice tone="alert" title={isRegister ? 'Inscription impossible' : 'Connexion impossible'} message={error} />}
        {isRegister ? <>
          <section className="auth-goal" aria-labelledby="auth-goal-title">
            <h2 id="auth-goal-title">Objectif hebdomadaire</h2>
            <V6Segment label="Objectif hebdomadaire" value={goal} options={goals} onChange={setGoal} />
          </section>
          <p className="auth-note">En continuant, tu acceptes que tes données restent sur ton espace.</p>
        </> : <>
          <V6List className="auth-remember">
            <V6Item title="Rester connecté 30 jours" detail="Tes séances sont enregistrées en local puis synchronisées."
              end={<V6Toggle label="Rester connecté 30 jours" checked={remember} onChange={setRemember} />} />
          </V6List>
          <V6Button variant="secondary" onClick={() => switchTo('register')}>Créer un compte</V6Button>
        </>}
      </main>
    </IonContent>
    <V6StickyAction>
      <V6Button loading={busy} onClick={() => void submit()}>{busy ? (isRegister ? 'Création…' : 'Connexion…') : isRegister ? 'Créer mon compte' : 'Se connecter'}</V6Button>
    </V6StickyAction>
  </IonPage>
}

export function LoginPage() { return <AuthPage mode="login" /> }
export function RegisterPage() { return <AuthPage mode="register" /> }

type LastWorkout = { id?: number | string; name?: string; date?: string }
const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

/**
 * 20 · Page introuvable: native state, the tab bar stays (rendered inside the tabs) so the user is never stuck.
 * « Reprendre » offers the latest workout from the cache (fetched only when signed in).
 */
export function NotFoundPage() {
  const router = useIonRouter()
  const signedIn = Boolean(getToken())
  const workouts = useQuery({ queryKey: ['history', 'workouts'], queryFn: () => apiRequest<LastWorkout[]>('api/workoutsessions'), enabled: signedIn })
  const last = [...(workouts.data ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0]
  return <IonPage>
    <IonContent fullscreen>
      <main className="auth-page auth-page--state">
        <V6StatePage icon={helpCircleOutline} title="Page introuvable" message="Cette page n’existe plus ou a été déplacée. Tes séances et tes carnets sont intacts.">
          <V6StatusPill icon={checkmarkCircleOutline} live={false}>Données locales intactes · rien n’a été perdu</V6StatusPill>
          <V6Button onClick={() => router.push(signedIn ? '/tabs/today' : '/login', 'root', 'replace')}>{signedIn ? 'Revenir à l’accueil' : 'Aller à la connexion'}</V6Button>
          {signedIn && <V6Button variant="secondary" onClick={() => router.push('/tabs/history/workouts', 'root', 'replace')}>Voir mes séances</V6Button>}
          {last?.id != null && <V6SessionRow tile={<img src="/icons/010-Dumbell.svg" alt="" className="auth-state__tile" />} title={`Reprendre : ${last.name || 'Séance'}`}
            detail={`Dernière séance · ${last.date ? shortDate.format(new Date(last.date)) : ''}`} ariaLabel={`Reprendre : ${last.name || 'Séance'}`}
            onClick={() => router.push(`/tabs/history/workouts/${last.id}`, 'root', 'replace')} />}
          {!last && signedIn && workouts.isPending && <V6SessionRow tile={<span className="auth-state__tile" />} title="Dernière séance…" detail="Chargement" />}
        </V6StatePage>
      </main>
    </IonContent>
  </IonPage>
}
