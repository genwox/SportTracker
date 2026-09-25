import { IonContent, IonPage } from '@ionic/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import { getDraftOwner } from '../../api/tokenStore'
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
  const subtitle = summary?.todayWorkout || summary?.todayCardio
    ? capitalize(dateFr.format(new Date())) : 'Une nouvelle journée commence.'
  return <IonPage>
    <IonContent>
      <V5Refresher onRefresh={() => query.refetch()} />
      <main className="today-page">
        <V5Header title={greeting} subtitle={subtitle} />
        {!query.data && query.isPending && <V5Loading />}
        {!query.data && query.isError && <V5State title="Impossible de charger ta journée"
          message="Impossible de récupérer tes séances. Vérifie ta connexion, puis réessaie."
          error onRetry={() => { void query.refetch() }} />}
        {summary && <>
          {summary.todayWorkout ? <V5Card><div className="t-hero">
            <span className="t-hero__eyebrow">Ta séance du jour</span>
            <h2 className="t-hero__name">{summary.todayWorkout.name}</h2>
            <span className="t-hero__meta">{summary.todayWorkout.workoutExercises?.length || 0} exercice{(summary.todayWorkout.workoutExercises?.length || 0) > 1 ? 's' : ''} • {Math.trunc(durationMinutes(summary.todayWorkout.duration))} min</span>
            <Link className="v5-button" to={`/tabs/history/workouts/${summary.todayWorkout.id}`}>Commencer la séance</Link>
          </div></V5Card> : summary.todayCardio ? <V5Card><div className="t-hero">
            <span className="t-hero__eyebrow">Cardio du jour</span>
            <h2 className="t-hero__name">{summary.todayCardio.name}</h2>
            <span className="t-hero__meta">{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Number(summary.todayCardio.distance || 0))} km • {Math.trunc(durationMinutes(summary.todayCardio.duration))} min</span>
            <Link className="v5-button" to={`/tabs/history/cardio/${summary.todayCardio.id}`}>Voir la séance</Link>
          </div></V5Card> : <V5Card><div className="t-hero t-hero--empty">
            <div className="t-hero__icon" aria-hidden="true">◎</div>
            <h2 className="t-hero__name">Aucune séance aujourd'hui</h2>
            <p className="t-hero__sub">Enregistre ta première séance pour commencer ton suivi.</p>
            <div className="t-hero__actions">
              <Link className="v5-button" to="/live">Démarrer une séance à vide</Link>
              <Link className="v5-button v5-button--secondary" to="/tabs/programs/workouts/new">Créer une séance musculation</Link>
              <Link className="v5-button v5-button--secondary" to="/tabs/history/cardio/new">+ Séance cardio</Link>
            </div>
          </div></V5Card>}

          <div className="t-section-label">Cette semaine</div>
          <V5Card><div className="t-week-grid">
            <div className="t-week-stat"><span className="t-week-stat__val">{summary.weekCount}</span><span className="t-week-stat__label">séance{summary.weekCount > 1 ? 's' : ''}</span></div>
            <div className="t-week-stat"><span className="t-week-stat__val">{summary.volume.value}<span className="t-week-stat__unit">{summary.volume.unit}</span></span><span className="t-week-stat__label">volume</span></div>
            <div className="t-week-stat"><span className="t-week-stat__val">{summary.weekTime}</span><span className="t-week-stat__label">temps</span></div>
          </div></V5Card>

          {summary.weekCount > 0 ? <><div className="t-section-label">Tes séances</div><V5Card><div className="t-bars">
            {summary.weekData.map((day, index) => <div className="t-bar-col" key={index}>
              <div className="t-bar-slot">{day.count > 0 && <div className={`t-bar-fill ${day.isToday ? 't-bar-fill--active' : ''}`}
                style={{ height: `${Math.max(10, day.count / Math.max(1, ...summary.weekData.map(item => item.count)) * 100)}%` }} />}</div>
              <span className={`t-bar-label ${day.isToday ? 't-bar-label--active' : ''}`}>{day.label}</span>
            </div>)}
          </div></V5Card></> : <Link to="/tabs/programs" className="t-carnet-link"><V5Card><div className="t-carnet">
            <div className="t-carnet__icon" aria-hidden="true">▤</div><div className="t-carnet__text"><strong>Préparer un carnet</strong><span>Organise tes prochains entraînements.</span></div>
          </div></V5Card></Link>}

          {summary.suggestedWorkout && <Link to={`/tabs/history/workouts/${summary.suggestedWorkout.id}`} className="t-resume-link"><V5Card><div className="t-resume">
            <div className="t-resume__text"><span className="t-resume__eyebrow">Reprendre</span><strong className="t-resume__name">{summary.suggestedWorkout.name}</strong>
              <span className="t-resume__sub">Dernière séance · {capitalize(shortDateFr.format(new Date(summary.suggestedWorkout.date || 0)))}</span></div><span aria-hidden="true">›</span>
          </div></V5Card></Link>}
          {query.isError && <V5Button secondary onClick={() => { void query.refetch() }}>Réessayer le rafraîchissement</V5Button>}
        </>}
      </main>
    </IonContent>
  </IonPage>
}
