import { useState } from 'react'
import { IonContent, IonIcon, IonPage } from '@ionic/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  appsOutline,
  chevronForwardOutline,
  colorPaletteOutline,
  helpCircleOutline,
  lockClosedOutline,
  notificationsOutline,
  optionsOutline,
  personCircleOutline,
} from 'ionicons/icons'
import { apiRequest } from '../../api/client'
import { useAuth } from '../../api/auth'
import { V5Button, V5Card, V6Header, V6Item, V6List, V6Skeleton, V5State } from '../../ui'
import { getGoalEmail, getWeeklyGoal, isGoalAvailable, setWeeklyGoal } from '../today/weeklyGoal'
import type { Cardio, Workout } from '../today/todayData'
import { summarizeProfile } from './profileStats'
import './profile.css'

export { LoginPage, RegisterPage } from '../../ui/AuthPages'

const monthYearFr = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

type ProfileLoad = { workouts: Workout[]; cardio: Cardio[]; email: string | null; goal: number }

async function loadProfile(): Promise<ProfileLoad> {
  const [workouts, cardio, email, goal] = await Promise.all([
    apiRequest<Workout[]>('api/workoutsessions'),
    apiRequest<Cardio[]>('api/cardiosessions'),
    getGoalEmail(),
    getWeeklyGoal(),
  ])
  return { workouts: workouts || [], cardio: cardio || [], email, goal }
}

const unavailableItems = [
  { label: 'Notifications', icon: notificationsOutline },
  { label: 'Apps connectées', icon: appsOutline },
  { label: 'Confidentialité', icon: lockClosedOutline },
]

export function ProfilePage() {
  const query = useQuery({ queryKey: ['profile', 'summary'], queryFn: loadProfile, staleTime: 0 })
  const { logout } = useAuth()
  const summary = query.data ? summarizeProfile(query.data) : null

  return <IonPage>
    <IonContent>
      <main className="profile-page">
        <V6Header title="Ton profil" avatar={false} />

        {!query.data && query.isPending && <V6Skeleton />}
        {!query.data && query.isError && <V5State title="Impossible de charger ton profil"
          message="Impossible de récupérer tes séances." error onRetry={() => { void query.refetch() }} />}

        {query.data && summary && <>
          <div className="pf-identity">
            <div className="pf-avatar" aria-hidden="true"><IonIcon icon={personCircleOutline} /></div>
            <div className="pf-identity__text">
              <strong>{query.data.email?.split('@')[0] || 'Compte'}</strong>
              <span>{query.data.email ?? (summary.memberSince ? `Membre depuis ${capitalize(monthYearFr.format(summary.memberSince))}` : 'Mon compte')}</span>
            </div>
          </div>

          <div className="pf-stats">
            <V5Card><div className="pf-stat"><span className="pf-stat__val">{summary.totalSessions}</span><span className="pf-stat__label">séances</span></div></V5Card>
            <V5Card><div className="pf-stat"><span className="pf-stat__val">{summary.streak} j</span><span className="pf-stat__label">série</span></div></V5Card>
            <V5Card><div className="pf-stat"><span className="pf-stat__val">{summary.weekSessions}/{query.data.goal}</span><span className="pf-stat__label">objectif</span></div></V5Card>
          </div>
          <p className="pf-total-time">{summary.totalMinutes} min d'entraînement au total</p>

          <V5Card>
            <div className="pf-goal">
              <div className="pf-goal__heading"><strong>Objectif hebdomadaire</strong><span>{summary.weekSessions} / {query.data.goal} séances</span></div>
              <div className="pf-goal__track" role="progressbar" aria-label="Objectif hebdomadaire" aria-valuenow={Math.min(summary.weekSessions, query.data.goal)} aria-valuemin={0} aria-valuemax={query.data.goal}><span style={{ width: `${Math.min(100, summary.weekSessions / query.data.goal * 100)}%` }} /></div>
            </div>
          </V5Card>

          <p className="pf-section-label">Préférences de séance</p>
          <div className="pf-menu">
            <Link to="/tabs/profile/preferences" className="pf-menu__item">
              <span className="pf-menu__icon pf-menu__icon--active"><IonIcon icon={optionsOutline} /></span>
              <span className="pf-menu__label">Objectifs &amp; préférences</span>
              <IonIcon icon={chevronForwardOutline} className="pf-menu__chevron" />
            </Link>

            {unavailableItems.map(item => (
              <div className="pf-menu__item pf-menu__item--disabled" aria-disabled="true" key={item.label}>
                <span className="pf-menu__icon"><IonIcon icon={item.icon} /></span>
                <span className="pf-menu__label">{item.label}</span>
                <span className="pf-menu__badge">Bientôt disponible</span>
              </div>
            ))}

            <Link to="/tabs/profile/help" className="pf-menu__item">
              <span className="pf-menu__icon pf-menu__icon--active"><IonIcon icon={helpCircleOutline} /></span>
              <span className="pf-menu__label">Aide &amp; support</span>
              <IonIcon icon={chevronForwardOutline} className="pf-menu__chevron" />
            </Link>
          </div>
        </>}

        {!query.isPending && <button type="button" className="pf-logout" onClick={logout}>
          Se déconnecter
        </button>}
      </main>
    </IonContent>
  </IonPage>
}

function GoalForm({ initialGoal }: { initialGoal: number }) {
  const [goal, setGoal] = useState(initialGoal)
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState(false)

  const decrement = () => { if (goal > 1) setGoal(goal - 1); setValidation(null) }
  const increment = () => { setGoal(goal + 1); setValidation(null) }

  const save = async () => {
    if (goal <= 0) { setValidation("L'objectif doit être un entier positif."); return }
    setSaving(true)
    setFeedback(null)
    const ok = await setWeeklyGoal(goal)
    setSaving(false)
    setFeedbackError(!ok)
    setFeedback(ok ? 'Objectif enregistré.' : 'Impossible d\'enregistrer l\'objectif pour le moment.')
  }

  return <>
    <V5Card>
      <div className="pp-goal">
        <span className="pp-goal__label" id="pp-goal-label">Objectif hebdomadaire (séances)</span>
        <div className="pp-stepper" role="group" aria-labelledby="pp-goal-label">
          <button type="button" onClick={decrement} disabled={goal <= 1} aria-label="Diminuer l'objectif">−</button>
          <span className="pp-stepper__value">{goal}</span>
          <button type="button" onClick={increment} aria-label="Augmenter l'objectif">+</button>
        </div>
        {validation && <p className="pp-validation">{validation}</p>}
      </div>
    </V5Card>

    {feedback && <p className={`pp-feedback ${feedbackError ? 'pp-feedback--error' : ''}`} role={feedbackError ? 'alert' : 'status'}>{feedback}</p>}

    <V5Button onClick={() => { void save() }} disabled={saving}>Enregistrer</V5Button>
  </>
}

export function ProfilePreferencesPage() {
  const query = useQuery({
    queryKey: ['profile', 'preferences'],
    queryFn: async () => ({ available: await isGoalAvailable(), goal: await getWeeklyGoal() }),
    staleTime: 0,
  })

  return <IonPage>
    <IonContent>
      <main className="pp-page">
        <V6Header title="Objectifs & préférences" backHref="/tabs/profile" avatar={false} />

        {!query.data && query.isPending && <V6Skeleton />}
        {query.data && !query.data.available && <V5State title="Préférences indisponibles"
          message="Identité ou stockage impossibles à confirmer : l'objectif par défaut est utilisé et ne peut pas être enregistré pour le moment."
          onRetry={() => { void query.refetch() }} />}

        {query.data && query.data.available && <GoalForm initialGoal={query.data.goal} />}
      </main>
    </IonContent>
  </IonPage>
}

export function HelpPage() {
  return <IonPage>
    <IonContent>
      <main className="hlp-page">
        <V6Header title="Aide & support" backHref="/tabs/profile" avatar={false} />

        <V5Card><div className="hlp-item">
          <strong>Créer une séance</strong>
          <p>Depuis l'accueil ou l'historique, utilise « + Muscu » ou « + Cardio » pour enregistrer une nouvelle séance.</p>
        </div></V5Card>

        <V5Card><div className="hlp-item">
          <strong>Suivre un carnet d'entraînement</strong>
          <p>Un carnet regroupe des séances types réutilisables. Lance une séance depuis ton carnet pour retrouver automatiquement les exercices et objectifs prévus.</p>
        </div></V5Card>

        <V5Card><div className="hlp-item">
          <strong>Objectif hebdomadaire</strong>
          <p>Le nombre de séances visées chaque semaine se règle depuis Profil → Objectifs &amp; préférences. Il est utilisé sur les pages Profil et Progrès.</p>
        </div></V5Card>

        {/* Temporary entry while V6 is being built: lets Damien try the new native kit on his iPhone. */}
        <V6List header="Nouvelle interface" note="Aperçu des composants V6 en cours d’intégration.">
          <V6Item icon={colorPaletteOutline} title="Aperçu du kit V6" detail="Boutons, listes, feuilles, glissements" routerLink="/tabs/profile/kit" />
        </V6List>

        <V5Card><div className="hlp-item">
          <strong>Rubriques à venir</strong>
          <p>Notifications, applications connectées et confidentialité ne sont pas encore disponibles dans l'application.</p>
        </div></V5Card>
      </main>
    </IonContent>
  </IonPage>
}
