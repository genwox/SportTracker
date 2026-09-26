import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IonIcon, useIonRouter } from '@ionic/react'
import { useLocation, useParams } from 'react-router-dom'
import { addOutline, playCircleOutline, star, statsChartOutline } from 'ionicons/icons'
import { apiRequest } from '../../api/client'
import {
  ExerciseDemoSheet, ExerciseThumb, V5State, V6Badge, V6Bars, V6Button, V6ChartCard, V6Chip, V6ChipRow, V6ContextMenu, V6RecordBanner,
  V6Segment, V6Skeleton, V6StatTiles, type V6ContextAction,
} from '../../ui'
import { useV6BackHref, useV6LongPress } from '../../ui/v6Hooks'
import { setTypeBadge } from '../programs/programData'
import { frNumber, maxOneRm, numberOf, useWorkouts, workoutVolume, type Exercise, type HistoryEntry, type Workout, type WorkoutExercise } from './data'
import { exerciseBlocks, matchesMuscle, muscleFilters, newestFirst, plural, setKey, tonnageParts, workoutRecords, workoutSets, type MuscleFilter } from './historyData'
import { useSessionRows } from './rows'
import { Overlay, Page, QueryError, SectionTitle, durationLabel, longDate, shortDate } from './shared'

const exercisePath = (exerciseId: number | string | undefined) => `/tabs/history/exercises/${exerciseId}`

/* ── 04 · Séances musculation ────────────────────────────────────────────── */

export function WorkoutSessionsPage() {
  const router = useIonRouter()
  const workouts = useWorkouts()
  const [muscle, setMuscle] = useState<MuscleFilter>('all')
  const rows = useSessionRows({ workouts: workouts.data, variant: 'workouts' })
  const all = workouts.data ?? []
  const shown = newestFirst(all).filter(workout => matchesMuscle(workout, muscle))
  const footer = <V6Button icon={addOutline} onClick={() => router.push('/tabs/history/workouts/new')}>Nouvelle séance</V6Button>
  return <Page title="Séances" subtitle={workouts.data ? `Musculation · ${plural(all.length, 'séance')}` : 'Musculation'} backHref="/tabs/history"
    refresh={() => workouts.refetch()} footer={footer}>
    <V6ChipRow label="Groupe musculaire">{muscleFilters.map(option =>
      <V6Chip key={option.value} selected={muscle === option.value} onClick={() => setMuscle(option.value)}>{option.label}</V6Chip>)}</V6ChipRow>
    {!workouts.data ? workouts.isError ? <QueryError title="Impossible de charger tes séances" error={workouts.error} retry={() => void workouts.refetch()} /> : <V6Skeleton count={3} />
      : !all.length ? <V5State title="Aucune séance enregistrée" message="Démarre une séance en direct depuis Aujourd’hui, ou saisis-la après coup." />
        : !shown.length ? <V5State title="Aucune séance pour ce groupe" message="Choisis un autre groupe musculaire." />
          : <section className="history-list" aria-label="Séances musculation">
            <p className="history-hint">Glisse une séance pour la supprimer ou la dupliquer ; appui long pour le menu.</p>
            {shown.map(rows.workoutRow)}
          </section>}
    {rows.contextMenu}
  </Page>
}

/* ── 06 · Détail séance muscu ────────────────────────────────────────────── */

type Demo = Pick<Exercise, 'name' | 'gifUrl' | 'instructionsFr'>

/** One exercise of the workout: thumbnail (demo), name (history), its V5 sets. Long press = menu. */
function ExerciseCard({ item, index, records, onMenu, onDemo }: {
  item: WorkoutExercise; index: number; records: Set<string>; onMenu: () => void; onDemo: () => void
}) {
  const router = useIonRouter()
  const { handlers, guard } = useV6LongPress(onMenu)
  const name = item.exercise?.name || `Exercice #${item.exerciseId}`
  const sets = item.exerciseSets ?? []
  return <article className="history-exercise">
    <header className="history-exercise__head">
      {item.exercise?.gifUrl ? <button type="button" className="history-thumb" onClick={onDemo} aria-label={`Voir le mouvement : ${name}`}>
        <ExerciseThumb exercise={item.exercise} size={44} /><span aria-hidden="true">▶</span></button>
        : <span className="history-thumb"><ExerciseThumb exercise={item.exercise} size={44} /></span>}
      <button type="button" className="history-exercise__title" onClick={guard(() => router.push(exercisePath(item.exerciseId)))} {...handlers}>
        <strong>{name}</strong><small>{plural(sets.length, 'série')}</small>
      </button>
    </header>
    {sets.length ? <ol className="history-sets">{sets.map((set, setIndex) => {
      const type = setTypeBadge(set.setType), record = records.has(setKey(index, setIndex))
      return <li key={set.id ?? setIndex} className={record ? 'is-record' : undefined}>
        <span className="history-sets__number">{setIndex + 1}</span>
        <V6Badge tone={type.key === 'Normal' ? 'ink' : type.tone}>{type.label}</V6Badge>
        <span className="history-sets__value"><strong>{frNumber(numberOf(set.weight))} kg</strong><strong>{numberOf(set.repetitions)} reps</strong></span>
        {set.rpe != null ? <span className="history-sets__rpe">RPE {set.rpe}</span> : <span />}
        {record ? <IonIcon icon={star} className="history-sets__star" aria-label="Record" /> : <span />}
      </li>
    })}</ol> : <p className="history-empty">Aucune série enregistrée.</p>}
    {item.notes && <p className="history-note">✎ {item.notes}</p>}
  </article>
}

export function WorkoutSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const backHref = useV6BackHref('/tabs/history')
  const router = useIonRouter()
  const session = useQuery({ queryKey: ['history', 'workout', sessionId], queryFn: () => apiRequest<Workout>(`api/workoutsessions/${sessionId}`) })
  const list = useWorkouts()
  const workout = session.data
  const [menu, setMenu] = useState<WorkoutExercise | null>(null)
  const [demo, setDemo] = useState<Demo | null>(null)
  // Records need the earlier sessions: computed over the cached list, with this session in its latest state.
  const records = workout ? workoutRecords([...(list.data ?? []).filter(item => String(item.id) !== sessionId), workout]).get(numberOf(workout.id)) : undefined
  const menuActions = (item: WorkoutExercise): V6ContextAction[] => [
    { label: 'Historique de l’exercice', icon: statsChartOutline, onSelect: () => router.push(exercisePath(item.exerciseId)) },
    ...(item.exercise?.gifUrl ? [{ label: 'Voir le mouvement', icon: playCircleOutline, onSelect: () => setDemo(item.exercise ?? null) }] : []),
  ]
  const subtitle = workout ? `${longDate(workout.date)} · ${durationLabel(workout.duration)}` : undefined
  return <Page title={workout?.name || 'Séance'} subtitle={subtitle} backHref={backHref} refresh={() => Promise.all([session.refetch(), list.refetch()])}>
    {!workout ? session.isError ? <QueryError title="Impossible de charger la séance" error={session.error} retry={() => void session.refetch()} /> : <V6Skeleton count={3} /> : <>
      <V6StatTiles tiles={[
        { ...tonnageParts(workoutVolume(workout)), label: 'volume' },
        { value: workoutSets(workout).length, label: 'séries' },
        { value: records?.count ?? 0, label: (records?.count ?? 0) > 1 ? 'records' : 'record' },
      ]} />
      {!workout.workoutExercises?.length ? <V5State title="Aucun exercice" message="Cette séance ne contient pas encore d’exercice." />
        : <section className="history-blocks" aria-label="Exercices de la séance">{exerciseBlocks(workout.workoutExercises).map(block => {
          const cards = block.items.map(({ exercise, index }) => <ExerciseCard key={exercise.id ?? index} item={exercise} index={index} records={records?.sets ?? new Set()}
            onMenu={() => setMenu(exercise)} onDemo={() => setDemo(exercise.exercise ?? null)} />)
          return block.group > 0 ? <div key={`superset-${block.items[0].index}`} className="history-superset">
            <p className="history-superset__label"><V6Badge tone="action">Superset {String.fromCharCode(64 + block.group)}</V6Badge><span>enchaîné sans repos</span></p>{cards}
          </div> : cards
        })}</section>}
    </>}
    <Overlay>
      <V6ContextMenu isOpen={!!menu} onDismiss={() => setMenu(null)} label={menu?.exercise?.name ?? 'Exercice'} actions={menu ? menuActions(menu) : []}
        preview={menu && <div className="history-menu-preview"><strong>{menu.exercise?.name}</strong><small>{plural(menu.exerciseSets?.length ?? 0, 'série')}</small></div>} />
      <ExerciseDemoSheet exercise={demo} onClose={() => setDemo(null)} />
    </Overlay>
  </Page>
}

/* ── 16 · Historique exercice ────────────────────────────────────────────── */

type Metric = 'orm' | 'volume' | 'weight' | 'reps'
const metrics = [{ value: 'orm', label: '1RM' }, { value: 'volume', label: 'Volume' }, { value: 'weight', label: 'Poids max' }, { value: 'reps', label: 'Reps' }] as const
const bestWeight = (entry: HistoryEntry) => Math.max(0, ...entry.sets.map(set => numberOf(set.weight)))
const metricOf: Record<Metric, { title: string; unit: string; value: (entry: HistoryEntry) => number }> = {
  orm: { title: '1RM estimé · Epley', unit: 'kg', value: maxOneRm },
  volume: { title: 'Volume par séance', unit: 'kg × reps', value: entry => numberOf(entry.totalVolume) },
  weight: { title: 'Meilleur poids', unit: 'kg', value: bestWeight },
  reps: { title: 'Répétitions totales', unit: 'reps', value: entry => numberOf(entry.totalReps) },
}

export function ExerciseProgressPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const { pathname } = useLocation()
  // Opened from a carnet session (Programmes tab) or from the history: its back button stays in its tab.
  const backHref = useV6BackHref(pathname.startsWith('/tabs/programs') ? pathname.replace(/\/exercises\/[^/]+\/history$/, '') : '/tabs/history')
  const [metric, setMetric] = useState<Metric>('orm')
  const history = useQuery({ queryKey: ['history', 'exercise', exerciseId], queryFn: () => apiRequest<HistoryEntry[]>(`api/exercises/${exerciseId}/history`) })
  const exercise = useQuery({ queryKey: ['history', 'exercise-name', exerciseId], queryFn: () => apiRequest<Exercise>(`api/exercises/${exerciseId}`) })
  const entries = [...(history.data ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const record = Math.max(0, ...entries.map(maxOneRm))
  const totalVolume = entries.reduce((sum, entry) => sum + numberOf(entry.totalVolume), 0)
  const weeks = entries.length ? Math.max(1, Math.ceil((new Date(entries.at(-1)!.date).getTime() - new Date(entries[0].date).getTime()) / (7 * 86_400_000))) : 0
  const recordEntry = [...entries].reverse().find(entry => record > 0 && Math.abs(maxOneRm(entry) - record) < 0.01)
  const chart = metricOf[metric]
  const values = entries.map(chart.value), top = Math.max(0, ...values)
  const subtitle = entries.length ? `${plural(entries.length, 'séance')} · ${plural(weeks, 'semaine')}` : undefined
  return <Page title={exercise.data?.name || 'Exercice'} subtitle={subtitle} backHref={backHref} refresh={() => Promise.all([history.refetch(), exercise.refetch()])}>
    {!history.data ? history.isError ? <QueryError title="Erreur de chargement" error={history.error} what="Cet exercice" retry={() => void history.refetch()} /> : <V6Skeleton count={3} />
      : entries.length === 0 ? <V5State title="Aucun historique" message="Les données apparaîtront après ta première séance." /> : <>
        <V6StatTiles tiles={[
          { value: frNumber(record, 0), unit: 'kg', label: '1RM estimé' },
          { value: frNumber(Math.max(0, ...entries.map(bestWeight))), unit: 'kg', label: 'poids max' },
          { ...tonnageParts(totalVolume), label: 'volume' },
        ]} />
        <V6Segment label="Métrique du graphique" value={metric} options={metrics} onChange={setMetric} />
        {entries.length >= 2 ? <V6ChartCard title={chart.title} caption={chart.unit}>
          <V6Bars label={`${chart.title} par séance`} bars={entries.map((entry, index) => ({ key: `${entry.date}-${index}`, label: shortDate(entry.date), value: values[index],
            highlight: values[index] > 0 && values[index] === top, title: `${longDate(entry.date)} : ${frNumber(values[index])} ${chart.unit}` }))} />
        </V6ChartCard> : <p className="history-hint">Le graphique apparaît à partir de deux séances.</p>}
        {recordEntry && <V6RecordBanner title={`${longDate(recordEntry.date)} · Record`}
          detail={`${[...recordEntry.sets].sort((a, b) => numberOf(b.weight) - numberOf(a.weight)).slice(0, 1).map(set => `${frNumber(numberOf(set.weight))} kg × ${numberOf(set.repetitions)} reps`)[0] ?? ''} · 1RM ${frNumber(record, 0)} kg`} />}
        <SectionTitle>Séances</SectionTitle>
        <div className="history-entries">{[...entries].reverse().map(entry => <article key={entry.date} className="history-entry">
          <header><strong>{longDate(entry.date)}</strong>{entry === recordEntry && <V6Badge tone="action">PR</V6Badge>}<small>1RM {frNumber(maxOneRm(entry), 0)} kg</small></header>
          <div className="history-entry__sets">{[...entry.sets].sort((a, b) => a.order - b.order).map((set, index) => {
            const type = setTypeBadge(set.setType)
            return <V6Badge key={index} tone={type.key === 'Normal' ? 'ink' : type.tone}>{type.label} · {frNumber(numberOf(set.weight))} kg × {numberOf(set.repetitions)}</V6Badge>
          })}</div>
        </article>)}</div>
      </>}
  </Page>
}
