import { useEffect, useState, type ReactNode } from 'react'
import { IonContent, IonPage, useIonRouter } from '@ionic/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  barbellOutline, calendarOutline, flagOutline, helpCircleOutline, lockClosedOutline, logOutOutline, readerOutline, speedometerOutline, syncOutline,
} from 'ionicons/icons'
import { apiRequest } from '../../api/client'
import { useAuth } from '../../api/auth'
import { getDraftOwner, isTokenRemembered, setTokenRemembered } from '../../api/tokenStore'
import {
  V5Refresher, V5State, V6Button, V6Header, V6Item, V6List, V6SkeletonTiles, V6Skeleton, V6StatTiles, V6StepperItem, V6StickyAction, V6Toggle,
} from '../../ui'
import { useV6ActionSheet, useV6Toast } from '../../ui/v6Feedback'
import { useOnline, useV6BackHref } from '../../ui/v6Hooks'
import { draftStore } from '../live/drafts'
import { getGoalEmail, getWeeklyGoal, isGoalAvailable, setWeeklyGoal } from '../today/weeklyGoal'
import type { Cardio, Workout } from '../today/todayData'
import { useShowRpe } from './preferences'
import { summarizeProfile } from './profileStats'
import './profile.css'

export { LoginPage, RegisterPage } from '../../ui/AuthPages'

const monthYearFr = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const time = (value: number) => new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

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

function Page({ title, subtitle, backHref, refresh, footer, className, children }: {
  title: string; subtitle?: string; backHref: string; refresh?: () => Promise<unknown>; footer?: ReactNode; className: string; children: ReactNode
}) {
  return <IonPage>
    <IonContent fullscreen>
      {refresh && <V5Refresher onRefresh={refresh} />}
      <main className={className}><V6Header title={title} subtitle={subtitle} backHref={backHref} avatar={false} />{children}</main>
    </IonContent>
    {footer && <V6StickyAction>{footer}</V6StickyAction>}
  </IonPage>
}

/** Drafts of live workouts still waiting for the server (Profil › Synchronisation, déconnexion). */
function usePendingDrafts(online: boolean) {
  const [pending, setPending] = useState(0)
  useEffect(() => {
    let active = true
    const refresh = () => {
      const owner = getDraftOwner()
      if (owner) void draftStore.list(owner, '').then(drafts => { if (active) setPending(drafts.filter(draft => draft.pendingSync || draft.syncConflict).length) }).catch(() => {})
    }
    refresh()
    window.addEventListener('sporttracker:draft-saved', refresh)
    return () => { active = false; window.removeEventListener('sporttracker:draft-saved', refresh) }
  }, [online])
  return pending
}

/* ── 19 · Profil ─────────────────────────────────────────────────────────── */

export function ProfilePage() {
  const router = useIonRouter(), actions = useV6ActionSheet(), { logout } = useAuth()
  const query = useQuery({ queryKey: ['profile', 'summary'], queryFn: loadProfile, staleTime: 0 })
  const backHref = useV6BackHref('/tabs/today')
  const online = useOnline(), pending = usePendingDrafts(online)
  const [showRpe, setShowRpe] = useShowRpe()
  const [remember, setRemember] = useState(isTokenRemembered)
  const summary = query.data ? summarizeProfile(query.data) : null
  const email = query.data?.email ?? getDraftOwner()
  const goal = query.data?.goal
  const title = email ? capitalize(email.split('@')[0]) : 'Profil'
  const subtitle = email ?? (summary?.memberSince ? `Membre depuis ${monthYearFr.format(summary.memberSince)}` : undefined)
  const sync = !online ? 'Hors ligne · reprendra au retour du réseau' : pending ? `${pending} séance${pending > 1 ? 's' : ''} en attente d’envoi` : 'Automatique dès le retour en ligne'

  const signOut = async () => {
    const confirmed = await actions.confirm({
      title: 'Se déconnecter ?', destructive: false, icon: logOutOutline, confirmText: 'Se déconnecter',
      message: pending ? 'Tes séances pas encore envoyées restent sur cet appareil : elles partiront à ta prochaine connexion.' : 'Tes séances restent sur ton compte : reconnecte-toi pour les retrouver.',
    })
    if (!confirmed) return
    logout()
    router.push('/login', 'root', 'replace')
  }

  return <Page className="profile-page" title={title} subtitle={subtitle} backHref={backHref} refresh={() => query.refetch()}>
    {!query.data && query.isPending && <><V6SkeletonTiles /><V6Skeleton count={1} /></>}
    {!query.data && query.isError && <V5State title="Impossible de charger ton profil" message="Vérifie ta connexion, puis réessaie : tes préférences restent modifiables." error onRetry={() => { void query.refetch() }} />}
    {summary && goal != null && <>
      <V6StatTiles tiles={[
        { value: summary.totalSessions, label: summary.totalSessions > 1 ? 'séances' : 'séance' },
        { value: summary.streak, unit: 'j', label: 'série' },
        { value: `${summary.weekSessions}/${goal}`, label: 'objectif' },
      ]} />
      <section className="pf-goal" aria-label="Objectif hebdomadaire">
        <div className="pf-goal__heading"><strong>Objectif hebdomadaire</strong><span>{summary.weekSessions} / {goal} séances</span></div>
        <div className="pf-goal__track" role="progressbar" aria-label="Objectif hebdomadaire" aria-valuenow={Math.min(summary.weekSessions, goal)} aria-valuemin={0} aria-valuemax={goal}>
          <span style={{ width: `${Math.min(100, summary.weekSessions / goal * 100)}%` }} /></div>
        <small>{summary.totalMinutes} min d’entraînement au total</small>
      </section>
    </>}

    <V6List header="Préférences de séance" note={query.dataUpdatedAt ? `Dernière synchronisation · ${time(query.dataUpdatedAt)}` : undefined}>
      <V6Item icon={flagOutline} title="Objectif hebdomadaire" detail="Séances visées chaque semaine" value={goal != null ? `${goal} séances` : undefined} routerLink="/tabs/profile/preferences" />
      <V6Item icon={speedometerOutline} title="Afficher le RPE" detail="Sur chaque série en direct" end={<V6Toggle label="Afficher le RPE" checked={showRpe} onChange={setShowRpe} />} />
      <V6Item icon={syncOutline} title="Synchronisation" detail={sync} />
    </V6List>

    <V6List header="Compte">
      <V6Item icon={lockClosedOutline} title="Rester connecté 30 jours" detail={remember ? 'Même après la fermeture de l’app' : 'Jusqu’à la fermeture de l’app'}
        end={<V6Toggle label="Rester connecté 30 jours" checked={remember} onChange={value => { setTokenRemembered(value); setRemember(value) }} />} />
      <V6Item icon={helpCircleOutline} title="Aide & support" routerLink="/tabs/profile/help" />
    </V6List>

    <V6Button variant="secondary" icon={logOutOutline} onClick={() => void signOut()}>Se déconnecter</V6Button>
  </Page>
}

/* ── Objectif hebdomadaire ───────────────────────────────────────────────── */

export function ProfilePreferencesPage() {
  const router = useIonRouter(), toast = useV6Toast(), cache = useQueryClient()
  const query = useQuery({ queryKey: ['profile', 'preferences'], queryFn: async () => ({ available: await isGoalAvailable(), goal: await getWeeklyGoal() }), staleTime: 0 })
  const [goal, setGoal] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const value = goal ?? query.data?.goal ?? 4
  const save = async () => {
    setSaving(true)
    const ok = await setWeeklyGoal(value)
    setSaving(false)
    if (!ok) { void toast.error('Objectif non enregistré', 'Réessaie dans un instant : ton choix est conservé.', () => void save()); return }
    await Promise.all([cache.invalidateQueries({ queryKey: ['profile'] }), cache.invalidateQueries({ queryKey: ['today'] }), cache.invalidateQueries({ queryKey: ['history'] })])
    void toast.success('Objectif enregistré', `${value} séances par semaine.`)
    if (router.canGoBack()) router.goBack()
  }
  const footer = query.data?.available && <V6Button loading={saving} onClick={() => void save()}>Enregistrer</V6Button>
  return <Page className="pp-page" title="Objectif" subtitle="Séances visées chaque semaine" backHref="/tabs/profile" footer={footer}>
    {!query.data && query.isPending && <V6Skeleton count={1} />}
    {query.data && !query.data.available && <V5State title="Préférences indisponibles"
      message="Ton compte n’a pas pu être confirmé : l’objectif par défaut est utilisé et ne peut pas être enregistré pour le moment." onRetry={() => { void query.refetch() }} />}
    {query.data?.available && <V6List header="Objectif hebdomadaire" note="Utilisé par Aujourd’hui, le Profil et Progrès.">
      <V6StepperItem label="Séances par semaine" value={value} min={1} max={14} onChange={setGoal} />
    </V6List>}
  </Page>
}

/* ── Aide & support ──────────────────────────────────────────────────────── */

export function HelpPage() {
  return <Page className="hlp-page" title="Aide & support" backHref="/tabs/profile">
    <V6List header="Bien démarrer">
      <V6Item icon={barbellOutline} title="Séance en direct" detail="Aujourd’hui › « Commencer » ou « Séance à vide » : chaque série validée au cercle lance le repos." />
      <V6Item icon={calendarOutline} title="Saisir une séance après coup" detail="Historique › Séances › « Nouvelle séance », ou « Nouvelle séance cardio » pour une sortie." />
      <V6Item icon={readerOutline} title="Suivre un carnet" detail="Programmes : un carnet regroupe des séances types ; « Démarrer » reprend ses exercices et ses objectifs." />
    </V6List>
    <V6List header="Gestes">
      <V6Item title="Glisser une ligne" detail="À gauche pour supprimer, à droite pour dupliquer une séance." />
      <V6Item title="Appui long" detail="Ouvre le menu d’une séance, d’un carnet ou d’un exercice." />
      <V6Item title="≡ à droite d’un exercice" detail="Maintiens-le puis glisse pour changer l’ordre." />
    </V6List>
    <V6List header="Hors ligne" note="Rien n’est perdu sans réseau : tes séances restent sur cet appareil et partent dès le retour de la connexion.">
      <V6Item icon={syncOutline} title="Synchronisation" detail="Automatique, visible sur Aujourd’hui et dans ton Profil." />
    </V6List>
  </Page>
}
