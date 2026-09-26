import { useState } from 'react'
import { IonRouterLink } from '@ionic/react'
import { getDraftOwner } from '../../api/tokenStore'
import { V5Card, V6Header, V6Skeleton, V5State } from '../../ui'
import { cardioName, dayLabel, durationMinutes, frNumber, localDay, muscleCounts, numberOf, useCardio, useWorkouts, weeklySetCounts } from './data'
import { Page, Refresh, NavCard, SectionTitle, dateKey, durationLabel, monday, today } from './shared'

export function HistoryPage() {
  const workouts = useWorkouts(), cardio = useCardio()
  const [filter, setFilter] = useState<'Tous' | 'Muscu' | 'Cardio'>('Tous')
  const items = [
    ...(workouts.data ?? []).map(session => ({ id: `w-${session.id}`, date: session.date ?? '', kind: 'Muscu', name: session.name || 'Séance musculation', meta: `${durationLabel(session.duration)} · ${session.workoutExercises?.length ?? 0} exercice(s)`, href: `/tabs/history/workouts/${session.id}` })),
    ...(cardio.data ?? []).map(session => ({ id: `c-${session.id}`, date: session.date ?? '', kind: 'Cardio', name: session.name || cardioName(session.type), meta: `${durationLabel(session.duration)}${numberOf(session.distance) > 0 ? ` · ${frNumber(numberOf(session.distance))} km` : ''}`, href: `/tabs/history/cardio/${session.id}` })),
  ].filter(item => filter === 'Tous' || item.kind === filter).sort((a, b) => b.date.localeCompare(a.date))
  const thisMonday = dateKey(monday(new Date()))
  const lastMondayDate = monday(new Date()); lastMondayDate.setDate(lastMondayDate.getDate() - 7)
  const lastMonday = dateKey(lastMondayDate)
  const groups = [
    { label: 'Cette semaine', items: items.filter(item => localDay(item.date) >= thisMonday) },
    { label: 'Semaine dernière', items: items.filter(item => localDay(item.date) >= lastMonday && localDay(item.date) < thisMonday) },
    { label: 'Plus tôt', items: items.filter(item => localDay(item.date) < lastMonday) },
  ]
  const loading = !workouts.data && !cardio.data && (workouts.isPending || cardio.isPending)
  const error = (workouts.isError && !workouts.data) || (cardio.isError && !cardio.data)
  return <Page><Refresh onRefresh={() => Promise.all([workouts.refetch(), cardio.refetch()])} />
    <V6Header title="Historique/Progrès" subtitle="Toutes tes séances" />
    <IonRouterLink routerLink="/tabs/history/progress" className="history-progress-link">Voir mes progrès <span aria-hidden="true">›</span></IonRouterLink>
    <div className="history-filters" role="tablist" aria-label="Filtrer l'historique">{(['Tous', 'Muscu', 'Cardio'] as const).map(option => <button key={option} type="button" role="tab" aria-selected={filter === option} className={filter === option ? 'active' : ''} onClick={() => setFilter(option)}>{option}</button>)}</div>
    {loading ? <V6Skeleton /> : error ? <V5State title="Impossible de charger l'historique" message="Impossible de récupérer tes séances." error onRetry={() => { void workouts.refetch(); void cardio.refetch() }} />
      : items.length === 0 ? <V5State title="Aucune séance enregistrée" message="Tes séances apparaîtront ici une fois enregistrées." />
        : groups.filter(group => group.items.length).map(group => <section key={group.label}><SectionTitle>{group.label}</SectionTitle><div className="history-stack">{group.items.map(item => <NavCard href={item.href} key={item.id}><div className="history-row">
          <span className={`history-row-icon ${item.kind === 'Muscu' ? 'strength' : ''}`} aria-hidden="true">{item.kind === 'Muscu' ? '◆' : '↗'}</span>
          <span className="history-row-copy"><strong>{item.name}</strong><small>{dayLabel(item.date, { day: 'numeric', month: 'short' })} · {item.meta}</small></span><span aria-hidden="true">›</span>
        </div></NavCard>)}</div></section>)}
    <div className="history-actions"><IonRouterLink routerLink="/tabs/history/cardio/new" className="history-action">+ Cardio</IonRouterLink><IonRouterLink routerLink="/tabs/history/cardio" className="history-action secondary">Toutes les sorties</IonRouterLink></div>
  </Page>
}

export function ProgressPage() {
  const workouts = useWorkouts(), cardio = useCardio()
  const allWorkouts = workouts.data ?? [], allCardio = cardio.data ?? []
  const start = monday(new Date()), startKey = dateKey(start)
  const previous = new Date(start); previous.setDate(previous.getDate() - 7)
  const previousKey = dateKey(previous)
  const currentWorkouts = allWorkouts.filter(item => localDay(item.date ?? '') >= startKey)
  const currentCardio = allCardio.filter(item => localDay(item.date ?? '') >= startKey)
  const weeklyMinutes = Math.floor([...currentWorkouts, ...currentCardio].reduce((sum, item) => sum + durationMinutes(item.duration), 0))
  const previousMinutes = Math.floor([...allWorkouts, ...allCardio].filter(item => localDay(item.date ?? '') >= previousKey && localDay(item.date ?? '') < startKey).reduce((sum, item) => sum + durationMinutes(item.duration), 0))
  const allDates = new Set([...allWorkouts, ...allCardio].map(item => localDay(item.date ?? '')))
  let streak = 0; const cursor = new Date(); while (allDates.has(dateKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() - 29)
  const distribution = muscleCounts(allWorkouts.filter(item => localDay(item.date ?? '') >= dateKey(thirtyDays)))
  const weeklyMuscles = muscleCounts(currentWorkouts)
  const totalSets = distribution.reduce((sum, item) => sum + item.count, 0)
  const maxSets = Math.max(1, ...weeklyMuscles.map(item => item.count))
  const owner = getDraftOwner()?.toLowerCase()
  const storedGoal = owner ? Number(localStorage.getItem(`st-weekly-goal:v1:${owner}`)) : 0
  const goal = Number.isInteger(storedGoal) && storedGoal > 0 ? storedGoal : 4
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(date.getDate() + index); return { label: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][index], key: dateKey(date), count: [...allWorkouts, ...allCardio].filter(item => localDay(item.date ?? '') === dateKey(date)).length } })
  const maxDay = Math.max(1, ...days.map(day => day.count))
  const weeks = weeklySetCounts(allWorkouts, start)
  const maxWeek = Math.max(1, ...weeks.map(week => week.count))
  const error = (workouts.isError && !workouts.data) || (cardio.isError && !cardio.data)
  return <Page><Refresh onRefresh={() => Promise.all([workouts.refetch(), cardio.refetch()])} />
    <V6Header title="Progrès" subtitle={`Semaine du ${dayLabel(start.toISOString(), { day: 'numeric', month: 'long' })}`} backHref="/tabs/history" />
    {!workouts.data && !cardio.data && (workouts.isPending || cardio.isPending) ? <V6Skeleton /> : error ? <V5State title="Impossible de charger tes progrès" message="Impossible de récupérer tes séances." error onRetry={() => { void workouts.refetch(); void cardio.refetch() }} /> : <>
      <V5Card className="history-minutes"><span>Minutes cette semaine</span><strong>{weeklyMinutes} min</strong>{weeklyMinutes !== previousMinutes && <small>{weeklyMinutes - previousMinutes > 0 ? '+' : ''}{weeklyMinutes - previousMinutes} min par rapport à la semaine dernière</small>}</V5Card>
      <div className="history-summary two"><V5Card><strong>{streak}</strong><span>jour{streak > 1 ? 's' : ''} · série en cours</span></V5Card><V5Card><strong>{currentWorkouts.length + currentCardio.length}</strong><span>séances cette semaine</span>{currentWorkouts.length + currentCardio.length >= goal && <small className="history-badge">Objectif atteint</small>}</V5Card></div>
      <section><SectionTitle>Répartition musculaire · 30 jours</SectionTitle><V5Card>{distribution.length ? <><div className="history-muscle-strip" role="img" aria-label="Répartition des séries par groupe musculaire">{distribution.map(item => <span key={item.id} style={{ width: `${item.count / totalSets * 100}%`, background: item.color }} title={`${item.label} : ${item.count} séries`} />)}</div><div className="history-legend">{distribution.map(item => <span key={item.id}><i style={{ background: item.color }} />{item.label} · {item.count}</span>)}</div></> : <p>Aucune série musculaire sur les 30 derniers jours.</p>}</V5Card></section>
      <section><SectionTitle>Séries par groupe · cette semaine</SectionTitle><V5Card>{weeklyMuscles.length ? <div className="history-muscle-bars" role="img" aria-label="Séries par groupe cette semaine">{weeklyMuscles.map(item => <div key={item.id} title={`${item.label} : ${item.count} séries`}><strong>{item.count}</strong><span className="history-muscle-track"><i style={{ height: `${item.count / maxSets * 100}%`, background: item.color }} /></span><small>{item.label}</small></div>)}</div> : <p>Aucune série enregistrée cette semaine.</p>}</V5Card></section>
      <section><SectionTitle>Séries par semaine</SectionTitle><V5Card><div className="history-week-bars" role="img" aria-label="Séries par semaine sur six semaines">{weeks.map(week => <div key={week.start} title={`Semaine du ${dayLabel(week.start)} : ${week.count} séries`}><strong>{week.count}</strong><span className="history-week-track"><i className={week.start === startKey ? 'active' : ''} style={{ height: `${week.count === 0 ? 0 : Math.max(8, week.count / maxWeek * 100)}%` }} /></span><small>{dayLabel(week.start, { day: 'numeric', month: 'short' })}</small></div>)}</div></V5Card></section>
      <section><SectionTitle>Séances par jour</SectionTitle><V5Card><div className="history-week-bars" role="img" aria-label="Séances par jour cette semaine">{days.map(day => <div key={day.key} title={`${day.key} : ${day.count} séance(s)`}><span className="history-week-track"><i className={day.key === today() ? 'active' : ''} style={{ height: `${day.count === 0 ? 0 : Math.max(10, day.count / maxDay * 100)}%` }} /></span><small>{day.label}</small></div>)}</div></V5Card></section>
      <V5Card><strong>Continue sur ta lancée</strong><p>Tes séances alimentent ce bilan.</p></V5Card>
    </>}
  </Page>
}
