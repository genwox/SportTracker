import { useEffect, useState } from 'react'
import { IonContent, IonPage } from '@ionic/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import { getDraftOwner } from '../../api/tokenStore'
import { muscleCounts } from '../history/data'
import { draftStore } from '../live/drafts'
import { V5Button, V5Card, V5Header, V5Loading, V5Refresher, V5State } from '../../ui'
import { durationMinutes, summarizeToday } from './todayData'
import type { TodayData, Workout, Cardio } from './todayData'
import './today.css'

const dateFr = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDateFr = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

async function loadToday(): Promise<TodayData> {
  const [workouts, cardio] = await Promise.all([
    apiRequest<Workout[]>('api/workoutsessions'), apiRequest<Cardio[]>('api/cardiosessions'),
  ])
  return { workouts: workouts || [], cardio: cardio || [] }
}

export function TodayPage() {
  const query = useQuery({ queryKey: ['today', 'sessions'], queryFn: loadToday, staleTime: 0 })
  const summary = query.data ? summarizeToday(query.data) : null
  const owner = getDraftOwner()
  const greeting = owner ? `Bonjour ${capitalize(owner.split('@')[0])}` : 'Bonjour'
  const [online, setOnline] = useState(() => navigator.onLine)
  const [pendingDrafts, setPendingDrafts] = useState(false)
  const [clock, setClock] = useState(() => Date.now())
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
  const muscles = summary ? muscleCounts(summary.recentWorkouts) : []
  const groupedMuscles = [
    { label: 'Pecs', count: muscles.find(item => item.id === 0)?.count ?? 0 },
    { label: 'Dos', count: muscles.find(item => item.id === 1)?.count ?? 0 },
    { label: 'Jambes', count: muscles.find(item => item.id === 5)?.count ?? 0 },
    { label: 'Épaules', count: muscles.find(item => item.id === 2)?.count ?? 0 },
    { label: 'Bras', count: muscles.filter(item => item.id === 3 || item.id === 4).reduce((sum, item) => sum + item.count, 0) },
  ]
  const maxMuscleSets = Math.max(1, ...groupedMuscles.map(item => item.count))
  const syncLabel = !online ? 'Hors ligne - sync en attente' : pendingDrafts ? 'Sync en attente' : query.isError ? 'Synchronisation interrompue' : query.isFetching ? 'Synchronisation en cours…' : query.dataUpdatedAt
    ? `Tout est synchronisé · il y a ${Math.max(0, Math.floor((clock - query.dataUpdatedAt) / 60_000))} min` : 'Synchronisation en cours…'
  return <IonPage>
    <IonContent>
      <V5Refresher onRefresh={() => query.refetch()} />
      <main className="today-page">
        <div className="t-greeting"><V5Header title={greeting} subtitle={capitalize(dateFr.format(new Date()))} />{summary && <span className="t-streak">{summary.streak} j d’affilée</span>}</div>
        <p className="t-sync" role="status"><span aria-hidden="true" />{syncLabel}</p>
        {!query.data && query.isPending && <div className="t-loading"><V5Loading /><div className="t-loading__stats">{[0, 1, 2].map(item => <div key={item} className="t-loading__stat" />)}</div><div className="t-loading__chart" /></div>}
        {!query.data && query.isError && <V5State title="Impossible de charger ta journée"
          message="Impossible de récupérer tes séances. Vérifie ta connexion, puis réessaie."
          error onRetry={() => { void query.refetch() }} />}
        {summary && <>
          {summary.todayWorkout ? <V5Card><div className="t-hero">
            <span className="t-hero__eyebrow">Ta séance du jour</span>
            <h2 className="t-hero__name">{summary.todayWorkout.name}</h2>
            <span className="t-hero__meta">{summary.todayWorkout.workoutExercises?.length || 0} exercice{(summary.todayWorkout.workoutExercises?.length || 0) > 1 ? 's' : ''} • {Math.trunc(durationMinutes(summary.todayWorkout.duration))} min</span>
            <div className="t-hero__actions"><Link className="v5-button" to={`/tabs/history/workouts/${summary.todayWorkout.id}`}>Voir la séance</Link><Link className="v5-button v5-button--secondary" to="/live">Séance à vide</Link></div>
          </div></V5Card> : summary.todayCardio ? <V5Card><div className="t-hero">
            <span className="t-hero__eyebrow">Cardio du jour</span>
            <h2 className="t-hero__name">{summary.todayCardio.name}</h2>
            <span className="t-hero__meta">{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Number(summary.todayCardio.distance || 0))} km • {Math.trunc(durationMinutes(summary.todayCardio.duration))} min</span>
            <Link className="v5-button" to={`/tabs/history/cardio/${summary.todayCardio.id}`}>Voir la séance</Link>
          </div></V5Card> : <V5Card><div className="t-hero t-hero--empty">
            <div className="t-hero__icon" aria-hidden="true"><img src="/icons/021-goal.svg" alt="" /></div>
            <h2 className="t-hero__name">Aucune séance prévue</h2>
            <p className="t-hero__sub">Lance une séance à vide et ajoute tes exercices au fur et à mesure, ou pars d’un carnet.</p>
            <div className="t-hero__actions">
              <Link className="v5-button" to="/live">Démarrer une séance à vide</Link>
              <Link className="v5-button v5-button--secondary" to="/tabs/programs">Choisir un carnet</Link>
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

          {summary.weekCount === 0 && <Link to="/tabs/programs" className="t-carnet-link"><V5Card><div className="t-carnet"><div className="t-carnet__text"><strong>Séance à vide, mode direct</strong><span>Exercice · Type de série · RPE</span></div></div></V5Card></Link>}

          {summary.suggestedWorkout && <Link to={`/tabs/history/workouts/${summary.suggestedWorkout.id}`} className="t-resume-link"><V5Card><div className="t-resume">
            <div className="t-resume__text"><strong className="t-resume__name">Reprendre : {summary.suggestedWorkout.name}</strong>
              <span className="t-resume__sub">Dernière séance · {capitalize(shortDateFr.format(new Date(summary.suggestedWorkout.date || 0)))}</span></div><span aria-hidden="true">›</span>
          </div></V5Card></Link>}
          {query.isError && <V5Button secondary onClick={() => { void query.refetch() }}>Réessayer le rafraîchissement</V5Button>}
        </>}
      </main>
    </IonContent>
  </IonPage>
}
