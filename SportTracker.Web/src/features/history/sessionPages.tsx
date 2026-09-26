import { useState } from 'react'
import { barbellOutline, pulseOutline, statsChartOutline } from 'ionicons/icons'
import { getDraftOwner } from '../../api/tokenStore'
import { V5State, V6Badge, V6Bars, V6ChartCard, V6Chip, V6ChipRow, V6Item, V6List, V6Segment, V6Skeleton, V6StatTiles } from '../../ui'
import { dayLabel, durationMinutes, localDay, muscleCounts, useCardio, useWorkouts, weeklySetCounts, type Cardio, type Workout } from './data'
import { inPeriod, newestFirst, periodOptions, plural, weeklyTotals } from './historyData'
import { useSessionRows } from './rows'
import { Page, QueryError, dateKey, monday, today } from './shared'

/* ── 17 · Historique général ─────────────────────────────────────────────── */

type Kind = 'all' | 'workout' | 'cardio'
const kinds = [{ value: 'all', label: 'Tout' }, { value: 'workout', label: 'Muscu' }, { value: 'cardio', label: 'Cardio' }] as const

export function HistoryPage() {
  const workouts = useWorkouts(), cardio = useCardio()
  const [kind, setKind] = useState<Kind>('all')
  const [period, setPeriod] = useState<string | null>(null)
  const rows = useSessionRows({ workouts: workouts.data, cardio: cardio.data, variant: 'history' })
  type Entry = { kind: 'workout'; date?: string; session: Workout } | { kind: 'cardio'; date?: string; session: Cardio }
  const all: Entry[] = [
    ...(kind !== 'cardio' ? (workouts.data ?? []).map(session => ({ kind: 'workout' as const, date: session.date, session })) : []),
    ...(kind !== 'workout' ? (cardio.data ?? []).map(session => ({ kind: 'cardio' as const, date: session.date, session })) : []),
  ]
  const periods = periodOptions(all.map(entry => entry.date ?? ''))
  const selected = periods.some(option => option.value === period) ? period : null
  const entries = newestFirst(all).filter(entry => inPeriod(entry.date, selected, periods))
  const weeks = weeklyTotals(all, () => 1, 6)
  const loading = !workouts.data && !cardio.data && (workouts.isPending || cardio.isPending)
  const failed = workouts.isError && !workouts.data ? workouts : cardio.isError && !cardio.data ? cardio : null
  const retry = () => { void workouts.refetch(); void cardio.refetch() }
  return <Page title="Historique" subtitle="Toutes tes séances" refresh={() => Promise.all([workouts.refetch(), cardio.refetch()])}>
    <V6List>
      <V6Item icon={statsChartOutline} title="Voir mes progrès" detail="Répartition, séries, temps actif" routerLink="/tabs/history/progress" />
      <V6Item icon={barbellOutline} title="Séances musculation" detail={workouts.data ? plural(workouts.data.length, 'séance') : undefined} routerLink="/tabs/history/workouts" />
      <V6Item icon={pulseOutline} title="Sorties cardio" detail={cardio.data ? plural(cardio.data.length, 'sortie') : undefined} routerLink="/tabs/history/cardio" />
    </V6List>
    <V6Segment label="Filtrer l’historique" value={kind} options={kinds} onChange={setKind} />
    {periods.length > 0 && <V6ChipRow label="Période">{periods.map(option =>
      <V6Chip key={option.value} selected={selected === option.value} onClick={() => setPeriod(selected === option.value ? null : option.value)}>{option.label}</V6Chip>)}</V6ChipRow>}
    {loading ? <V6Skeleton count={3} /> : failed ? <QueryError title="Impossible de charger l’historique" error={failed.error} retry={retry} /> : <>
      {all.length > 0 && <V6ChartCard title="Séances par semaine" caption="6 sem.">
        <V6Bars label="Séances par semaine sur six semaines" showValues bars={weeks.map(week => ({ key: week.start, label: week.label, value: week.value, highlight: week.current, title: `Semaine du ${dayLabel(week.start)} : ${plural(week.value, 'séance')}` }))} />
      </V6ChartCard>}
      {entries.length === 0 ? <V5State title="Aucune séance enregistrée" message={all.length ? 'Aucune séance sur cette période.' : 'Tes séances apparaîtront ici une fois enregistrées.'} />
        : <section className="history-list" aria-label="Séances">{entries.map(entry => entry.kind === 'workout' ? rows.workoutRow(entry.session) : rows.cardioRow(entry.session))}</section>}
    </>}
    {rows.contextMenu}
  </Page>
}

/* ── 18 · Progrès ────────────────────────────────────────────────────────── */

export function ProgressPage() {
  const workouts = useWorkouts(), cardio = useCardio()
  const allWorkouts = workouts.data ?? [], allCardio = cardio.data ?? []
  const everything = [...allWorkouts, ...allCardio]
  const start = monday(new Date()), startKey = dateKey(start)
  const previous = new Date(start); previous.setDate(previous.getDate() - 7)
  const previousKey = dateKey(previous)
  const thisWeek = everything.filter(item => localDay(item.date ?? '') >= startKey)
  const currentWorkouts = allWorkouts.filter(item => localDay(item.date ?? '') >= startKey)
  const weeklyMinutes = Math.floor(thisWeek.reduce((sum, item) => sum + durationMinutes(item.duration), 0))
  const previousMinutes = Math.floor(everything.filter(item => localDay(item.date ?? '') >= previousKey && localDay(item.date ?? '') < startKey).reduce((sum, item) => sum + durationMinutes(item.duration), 0))
  const allDates = new Set(everything.map(item => localDay(item.date ?? '')))
  let streak = 0; const cursor = new Date(); while (allDates.has(dateKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() - 29)
  const distribution = muscleCounts(allWorkouts.filter(item => localDay(item.date ?? '') >= dateKey(thirtyDays)))
  const weeklyMuscles = muscleCounts(currentWorkouts)
  const totalSets = distribution.reduce((sum, item) => sum + item.count, 0)
  const owner = getDraftOwner()?.toLowerCase()
  const storedGoal = owner ? Number(localStorage.getItem(`st-weekly-goal:v1:${owner}`)) : 0
  const goal = Number.isInteger(storedGoal) && storedGoal > 0 ? storedGoal : 4
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start); date.setDate(date.getDate() + index)
    const key = dateKey(date)
    return { key, label: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][index], minutes: Math.round(everything.filter(item => localDay(item.date ?? '') === key).reduce((sum, item) => sum + durationMinutes(item.duration), 0)) }
  })
  const weeks = weeklySetCounts(allWorkouts, start)
  const diff = weeklyMinutes - previousMinutes
  const failed = workouts.isError && !workouts.data ? workouts : cardio.isError && !cardio.data ? cardio : null
  return <Page title="Progrès" subtitle={`Semaine du ${dayLabel(start.toISOString(), { day: 'numeric', month: 'long' })}`} backHref="/tabs/history"
    refresh={() => Promise.all([workouts.refetch(), cardio.refetch()])}>
    {!workouts.data && !cardio.data && (workouts.isPending || cardio.isPending) ? <V6Skeleton count={3} />
      : failed ? <QueryError title="Impossible de charger tes progrès" error={failed.error} retry={() => { void workouts.refetch(); void cardio.refetch() }} /> : <>
        {streak > 1 && <p className="history-streak">{streak} j d’affilée</p>}
        <V6StatTiles tiles={[
          { value: `${thisWeek.length}/${goal}`, label: 'séances cette semaine' },
          { value: weeklyMinutes, unit: 'min', label: 'cette semaine' },
          { value: streak, unit: 'j', label: 'série en cours' },
        ]} />
        {(thisWeek.length >= goal || diff !== 0) && <div className="history-progress-notes">
          {thisWeek.length >= goal && <V6Badge tone="action">Objectif atteint</V6Badge>}
          {diff !== 0 && <V6Badge tone="surface">{diff > 0 ? '+' : ''}{diff} min par rapport à la semaine dernière</V6Badge>}
        </div>}
        <V6ChartCard title="Répartition musculaire" caption="30 j">
          {distribution.length ? <><div className="history-muscle-strip" role="img" aria-label="Répartition des séries par groupe musculaire">{distribution.map(item => <span key={item.id} style={{ width: `${item.count / totalSets * 100}%`, background: item.color }} title={`${item.label} : ${item.count} séries`} />)}</div>
            <div className="history-legend">{distribution.map(item => <span key={item.id}><i style={{ background: item.color }} />{item.label} · {item.count}</span>)}</div></>
            : <p className="history-empty">Aucune série musculaire sur les 30 derniers jours.</p>}
        </V6ChartCard>
        <V6ChartCard title="Séries par groupe" caption="cette semaine">
          {weeklyMuscles.length ? <V6Bars label="Séries par groupe cette semaine" showValues bars={weeklyMuscles.map(item => ({ key: String(item.id), label: item.label, value: item.count, color: item.color, title: `${item.label} : ${item.count} séries` }))} />
            : <p className="history-empty">Aucune série enregistrée cette semaine.</p>}
        </V6ChartCard>
        <V6ChartCard title="Séries par semaine" caption="6 sem.">
          <V6Bars label="Séries par semaine sur six semaines" showValues bars={weeks.map(week => ({ key: week.start, label: dayLabel(week.start, { day: 'numeric', month: 'short' }).replace('.', ''), value: week.count, highlight: week.start === startKey, title: `Semaine du ${dayLabel(week.start)} : ${week.count} séries` }))} />
        </V6ChartCard>
        <V6ChartCard title="Temps actif" caption="7 j">
          <V6Bars label="Minutes d’entraînement par jour cette semaine" bars={days.map(day => ({ key: day.key, label: day.label, value: day.minutes, highlight: day.key === today() && day.minutes > 0, title: `${day.key} : ${day.minutes} min` }))} />
        </V6ChartCard>
      </>}
  </Page>
}
