import { useEffect, useState } from 'react'
import { IonContent, IonIcon, IonPage, useIonRouter } from '@ionic/react'
import { useQuery } from '@tanstack/react-query'
import { addOutline, barbellOutline, checkmarkCircleOutline, cloudOfflineOutline, playOutline, syncOutline } from 'ionicons/icons'
import { apiRequest } from '../../api/client'
import { getDraftOwner } from '../../api/tokenStore'
import { muscleCounts } from '../history/data'
import { draftStore } from '../live/drafts'
import { CatalogSheet } from '../live/CatalogSheet'
import { usePrograms, useProgramDetails, useProgramsSettled } from '../programs/programQueries'
import { activeProgramId, doneThisWeek, lastWorkoutFor, nextSession, num, sessionTotals, sortedExercises, supersetNames } from '../programs/programData'
import { useV6Toast } from '../../ui/v6Feedback'
import { V5Card, V5Refresher, V5State, V6Badge, V6Button, V6Header, V6SessionRow, V6Skeleton } from '../../ui'
import { durationMinutes, summarizeToday } from './todayData'
import type { TodayData, Workout, Cardio } from './todayData'
import './today.css'

const dateFr = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDateFr = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`

async function loadToday(): Promise<TodayData> {
  const [workouts, cardio] = await Promise.all([
    apiRequest<Workout[]>('api/workoutsessions'), apiRequest<Cardio[]>('api/cardiosessions'),
  ])
  return { workouts: workouts || [], cardio: cardio || [] }
}

export function TodayPage() {
  const router = useIonRouter(), toast = useV6Toast()
  const query = useQuery({ queryKey: ['today', 'sessions'], queryFn: loadToday, staleTime: 0 })
  const programsQuery = usePrograms()
  const programs = useProgramDetails(programsQuery.data)
  const programsSettled = useProgramsSettled()
  const summary = query.data ? summarizeToday(query.data) : null
  const owner = getDraftOwner()
  const greeting = owner ? `Bonjour ${capitalize(owner.split('@')[0])}` : 'Bonjour'
  const [online, setOnline] = useState(() => navigator.onLine)
  const [pendingDrafts, setPendingDrafts] = useState(false)
  const [clock, setClock] = useState(() => Date.now())
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    const timer = window.setInterval(() => setClock(Date.now()), 60_000)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.clearInterval(timer) }
  }, [])
  useEffect(() => {
    let active = true
    if (owner) void draftStore.list(owner, '').then(drafts => { if (active) setPendingDrafts(drafts.some(draft => draft.pendingSync || draft.syncConflict)) }).catch(() => {})
    return () => { active = false }
  }, [owner, online, query.dataUpdatedAt])

  const workouts = query.data?.workouts ?? []
  // « Ta séance du jour »: the next session to do this week in the active carnet (V5 « Commencer »).
  const activeId = activeProgramId(programs, workouts)
  const activeProgram = programs.find(program => num(program.id) === activeId)
  const planned = activeProgram ? nextSession(activeProgram, doneThisWeek(workouts)) : undefined
  const plannedFirst = sortedExercises(planned)[0]
  const plannedTotals = sessionTotals(planned)
  const plannedSupersets = planned ? supersetNames(lastWorkoutFor(num(planned.id), workouts)) : []
  const todayProgram = summary?.todayWorkout?.workoutProgramSessionId != null
    ? programs.find(program => program.sessions?.some(session => num(session.id) === num(summary.todayWorkout?.workoutProgramSessionId))) : undefined
  const todaySession = todayProgram?.sessions?.find(session => num(session.id) === num(summary?.todayWorkout?.workoutProgramSessionId))
  const todayFirst = sortedExercises(todaySession)[0]
  const programLive = (programId: unknown, sessionId: unknown, exerciseId: unknown) => `/live/programs/${num(programId as number)}/sessions/${num(sessionId as number)}/exercises/${num(exerciseId as number)}`

  const muscles = summary ? muscleCounts(summary.recentWorkouts) : []
  const groupedMuscles = [
    { label: 'Pecs', count: muscles.find(item => item.id === 0)?.count ?? 0 },
    { label: 'Dos', count: muscles.find(item => item.id === 1)?.count ?? 0 },
    { label: 'Jambes', count: muscles.find(item => item.id === 5)?.count ?? 0 },
    { label: 'Épaules', count: muscles.find(item => item.id === 2)?.count ?? 0 },
    { label: 'Bras', count: muscles.filter(item => item.id === 3 || item.id === 4).reduce((sum, item) => sum + item.count, 0) },
  ]
  const maxMuscleSets = Math.max(1, ...groupedMuscles.map(item => item.count))
  const syncing = !online || pendingDrafts || query.isError || query.isFetching || !query.dataUpdatedAt
  const syncLabel = !online ? 'Hors ligne - sync en attente' : pendingDrafts ? 'Sync en attente' : query.isError ? 'Synchronisation interrompue' : query.isFetching ? 'Synchronisation en cours…' : query.dataUpdatedAt
    ? `Tout est synchronisé · ${summary && summary.weekCount === 0 && !pendingDrafts ? 'rien en attente' : `il y a ${Math.max(0, Math.floor((clock - query.dataUpdatedAt) / 60_000))} min`}` : 'Synchronisation en cours…'
  const empty = summary && !summary.todayWorkout && !summary.todayCardio && !planned && programsSettled
  const refresh = () => Promise.all([query.refetch(), programsQuery.refetch()])

  return <IonPage>
    <IonContent fullscreen>
      <V5Refresher onRefresh={refresh} />
      <main className="today-page">
        <V6Header title={greeting} subtitle={capitalize(dateFr.format(new Date()))} extra={summary && summary.streak > 0 && <span className="t-streak">{summary.streak} j d’affilée</span>} />
        <p className="t-sync" role="status">
          <IonIcon icon={!online ? cloudOfflineOutline : syncing ? syncOutline : checkmarkCircleOutline} aria-hidden="true" />
          <span className="t-sync__label">{syncLabel}</span>
          {summary && summary.streak === 0 && <span className="t-sync__streak" aria-label="Série de 0 jour">0 j</span>}
        </p>
        {!query.data && query.isPending && <div className="t-loading" aria-busy="true"><V6Skeleton count={1} /><div className="t-loading__stats">{[0, 1, 2].map(item => <div key={item} className="t-loading__stat" />)}</div><div className="t-loading__chart" /></div>}
        {!query.data && query.isError && <V5State title="Impossible de charger ta journée"
          message="Impossible de récupérer tes séances. Vérifie ta connexion, puis réessaie."
          error onRetry={() => { void query.refetch() }} />}
        {summary && <>
          {summary.todayWorkout ? <V5Card><div className="t-hero">
            <span className="t-hero__eyebrow">Ta séance du jour</span>
            <h2 className="t-hero__name">{summary.todayWorkout.name}</h2>
            <span className="t-hero__meta">{[plural(summary.todayWorkout.workoutExercises?.length || 0, 'exercice'), `${Math.trunc(durationMinutes(summary.todayWorkout.duration))} min`, ...supersetNames(summary.todayWorkout).map(letter => `superset ${letter}`)].join(' • ')}</span>
            <div className="t-hero__actions">
              {todayProgram && todaySession && todayFirst
                ? <V6Button icon={playOutline} onClick={() => router.push(programLive(todayProgram.id, todaySession.id, todayFirst.exerciseId))}>Continuer</V6Button>
                : <V6Button onClick={() => router.push(`/tabs/history/workouts/${summary.todayWorkout?.id}`)}>Voir la séance</V6Button>}
              <V6Button variant="secondary" onClick={() => router.push('/live')}>Séance à vide</V6Button>
            </div>
          </div></V5Card> : summary.todayCardio ? <V5Card><div className="t-hero">
            <span className="t-hero__eyebrow">Cardio du jour</span>
            <h2 className="t-hero__name">{summary.todayCardio.name}</h2>
            <span className="t-hero__meta">{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Number(summary.todayCardio.distance || 0))} km • {Math.trunc(durationMinutes(summary.todayCardio.duration))} min</span>
            <V6Button onClick={() => router.push(`/tabs/history/cardio/${summary.todayCardio?.id}`)}>Voir la séance</V6Button>
          </div></V5Card> : planned && activeProgram ? <V5Card><div className="t-hero">
            <div className="t-hero__top">
              <div className="t-hero__heading">
                <span className="t-hero__eyebrow">Ta séance du jour · {activeProgram.name}</span>
                <h2 className="t-hero__name">{planned.name}</h2>
                <span className="t-hero__meta">{[plural(plannedTotals.exercises, 'exercice'), plural(plannedTotals.sets, 'série'), ...plannedSupersets.map(letter => `superset ${letter}`)].join(' • ')}</span>
              </div>
              <span className="t-hero__goal" aria-hidden="true"><img src="/icons/021-goal.svg" alt="" /></span>
            </div>
            <div className="t-hero__actions">
              <V6Button icon={playOutline} onClick={() => router.push(plannedFirst ? programLive(activeProgram.id, planned.id, plannedFirst.exerciseId) : `/tabs/programs/${num(activeProgram.id)}/sessions/${num(planned.id)}`)}>Commencer</V6Button>
              <V6Button variant="secondary" onClick={() => router.push('/live')}>Séance à vide</V6Button>
            </div>
          </div></V5Card> : !programsSettled ? <V6Skeleton count={1} /> : <V5Card><div className="t-hero t-hero--empty">
            <div className="t-hero__icon" aria-hidden="true"><IonIcon icon={barbellOutline} /></div>
            <h2 className="t-hero__name">Aucune séance prévue</h2>
            <p className="t-hero__sub">Lance une séance à vide et ajoute tes exercices au fur et à mesure, ou pars d’un carnet.</p>
            <div className="t-hero__actions t-hero__actions--stack">
              <V6Button onClick={() => router.push('/live')}>Démarrer une séance à vide</V6Button>
              <V6Button variant="secondary" onClick={() => router.push('/tabs/programs')}>Choisir un carnet</V6Button>
            </div>
          </div></V5Card>}

          {summary.weekCount > 0 && <V5Card className="t-muscle-card"><div className="t-muscle-head"><h2>Séries par groupe</h2><span>7 jours</span></div><div className="t-muscle-bars" role="img" aria-label="Séries par groupe musculaire sur sept jours">
            {groupedMuscles.map(item => <div className="t-muscle-col" key={item.label} title={`${item.label} : ${item.count} séries`}><div className="t-muscle-track"><i style={{ height: `${item.count ? Math.max(15, item.count / maxMuscleSets * 100) : 0}%` }} /></div><span>{item.label}</span></div>)}
          </div></V5Card>}
          {summary.weekCount > 0 && <div className="t-week-grid">
            <div className="t-week-stat"><span className="t-week-stat__val">{summary.weekCount}</span><span className="t-week-stat__label">séance{summary.weekCount > 1 ? 's' : ''}</span></div>
            <div className="t-week-stat"><span className="t-week-stat__val">{summary.volume.value}<span className="t-week-stat__unit">{summary.volume.unit}</span></span><span className="t-week-stat__label">volume</span></div>
            <div className="t-week-stat"><span className="t-week-stat__val">{summary.weekSets}</span><span className="t-week-stat__label">séries</span></div>
          </div>}

          {(empty || summary.weekCount === 0) && <>
            <section className="t-direct" aria-label="Séance à vide, mode direct">
              <div className="t-direct__head"><strong>Séance à vide, mode direct</strong><V6Badge tone="action">Nouveau</V6Badge></div>
              <ol className="t-direct__steps"><li>1 · Exercice</li><li>2 · Type de série</li><li>3 · RPE</li></ol>
            </section>
            <V6SessionRow tile={<IonIcon icon={addOutline} />} title="Créer un exercice personnalisé" detail="Ajoute un mouvement absent de la bibliothèque" onClick={() => setCreating(true)} />
          </>}

          {summary.suggestedWorkout && <V6SessionRow tile={<IonIcon icon={barbellOutline} />} title={`Reprendre : ${summary.suggestedWorkout.name}`}
            detail={`Dernière séance · ${capitalize(shortDateFr.format(new Date(summary.suggestedWorkout.date || 0)))}`}
            onClick={() => router.push(`/tabs/history/workouts/${summary.suggestedWorkout?.id}`)} />}
          {query.isError && <V6Button variant="secondary" onClick={() => { void query.refetch() }}>Réessayer le rafraîchissement</V6Button>}
        </>}
      </main>
    </IonContent>
    <CatalogSheet open={creating} startCreating createLabel="Créer l’exercice" onClose={() => setCreating(false)}
      onAdd={exercises => { setCreating(false); void toast.success(exercises.length ? `« ${exercises.at(-1)?.name} » ajouté à la bibliothèque` : 'Bibliothèque à jour') }} />
  </IonPage>
}
