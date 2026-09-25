import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { apiRequest, ApiError } from '../../api/client'
import { V5Card, V5Header, V5Loading, V5State } from '../../ui'
import { dayLabel, frNumber, maxOneRm, numberOf, setName, workoutVolume, type Exercise, type HistoryEntry, type Workout } from './data'
import { Page, Refresh, NavCard, SectionTitle, detailDate, durationLabel } from './shared'

function MetricChart({ title, unit, entries, value }: { title: string; unit: string; entries: HistoryEntry[]; value: (entry: HistoryEntry) => number }) {
  const max = Math.max(0, ...entries.map(value))
  return <section className="history-chart"><V5Card><div className="history-chart-heading"><SectionTitle>{title}</SectionTitle><p className="history-chart-caption">{unit} · {entries.length} séances</p></div><div className="history-bars" role="img" aria-label={`${title} par séance`}>
    {entries.map((entry, index) => { const point = value(entry); return <div className="history-bar-column" key={`${entry.date}-${index}`} title={`${dayLabel(entry.date)} : ${frNumber(point)} ${unit}`}>
      <div className={`history-bar ${point > 0 && point === max ? 'record' : ''}`} style={{ height: `${point <= 0 || max <= 0 ? 0 : Math.max(6, point / max * 100)}%` }} /><small>{dayLabel(entry.date, { day: 'numeric', month: 'short' })}</small>
    </div> })}</div></V5Card></section>
}

export function ExerciseProgressPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const history = useQuery({ queryKey: ['history', 'exercise', exerciseId], queryFn: () => apiRequest<HistoryEntry[]>(`api/exercises/${exerciseId}/history`) })
  const exercise = useQuery({ queryKey: ['history', 'exercise-name', exerciseId], queryFn: () => apiRequest<Exercise>(`api/exercises/${exerciseId}`) })
  const entries = [...(history.data ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const record = Math.max(0, ...entries.map(maxOneRm))
  const bestWeight = Math.max(0, ...entries.flatMap(entry => entry.sets.map(set => numberOf(set.weight))))
  const totalVolume = entries.reduce((sum, entry) => sum + numberOf(entry.totalVolume), 0)
  return <Page><Refresh onRefresh={() => Promise.all([history.refetch(), exercise.refetch()])} /><V5Header title={exercise.data?.name || 'Exercice'} backHref="/tabs/history" />
    {!history.data && history.isPending ? <V5Loading /> : history.isError && !history.data ? <V5State title="Erreur de chargement" message="Impossible de récupérer l'historique." error onRetry={() => void history.refetch()} />
      : entries.length === 0 ? <V5State title="Aucun historique" message="Les données apparaîtront après ta première séance." /> : <>
        <p className="history-intro">{entries.length} séances enregistrées</p>
        <div className="history-summary"><V5Card><strong>{frNumber(record)} kg</strong><span>1RM estimé</span></V5Card><V5Card><strong>{frNumber(bestWeight)} kg</strong><span>poids max</span></V5Card><V5Card><strong>{frNumber(totalVolume)} kg</strong><span>volume cumulé</span></V5Card></div>
        {entries.length >= 2 && <><MetricChart title="Évolution du 1RM" unit="kg" entries={entries} value={maxOneRm} />
          <MetricChart title="Volume par séance" unit="kg × reps" entries={entries} value={entry => numberOf(entry.totalVolume)} />
          <MetricChart title="Meilleur poids soulevé" unit="kg" entries={entries} value={entry => Math.max(0, ...entry.sets.map(set => numberOf(set.weight)))} />
          <MetricChart title="Répétitions totales" unit="reps" entries={entries} value={entry => numberOf(entry.totalReps)} /></>}
        <SectionTitle>Historique</SectionTitle>{[...entries].reverse().map(entry => <V5Card key={entry.date} className="history-entry"><strong>{dayLabel(entry.date)}{Math.abs(maxOneRm(entry) - record) < 0.01 && <em> · Record</em>}</strong>
          <span>{[...entry.sets].sort((a, b) => a.order - b.order).map(set => `${frNumber(numberOf(set.weight))} × ${numberOf(set.repetitions)}`).join(' · ')}</span></V5Card>)}
      </>}
  </Page>
}

export function WorkoutSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const session = useQuery({ queryKey: ['history', 'workout', sessionId], queryFn: () => apiRequest<Workout>(`api/workoutsessions/${sessionId}`) })
  const workout = session.data
  const message = session.error instanceof ApiError && session.error.status === 404 ? 'Cette séance est introuvable ou inaccessible.' : 'Vérifie ta connexion, puis réessaie.'
  return <Page><Refresh onRefresh={() => session.refetch()} /><V5Header title={workout?.name || 'Détail de la séance'} subtitle={detailDate(workout?.date)} backHref="/tabs/history" />
    {!workout && session.isPending ? <V5Loading /> : session.isError && !workout ? <V5State title="Impossible de charger la séance" message={message} error onRetry={() => void session.refetch()} />
      : workout && <><div className="history-summary"><V5Card><strong>{durationLabel(workout.duration)}</strong><span>durée</span></V5Card><V5Card><strong>{frNumber(workoutVolume(workout))} kg</strong><span>volume</span></V5Card><V5Card><strong>{workout.workoutExercises?.length ?? 0}</strong><span>exercices</span></V5Card></div>
        {!workout.workoutExercises?.length ? <V5State title="Aucun exercice" message="Cette séance ne contient pas encore d'exercice." /> : <section><SectionTitle>Exercices de la séance</SectionTitle><div className="history-stack">
          {workout.workoutExercises.map((item, index) => <NavCard key={item.id ?? index} href={`/tabs/history/exercises/${item.exerciseId}`} className={item.supersetGroupId != null ? 'history-superset' : ''}>
            {item.supersetGroupId != null && <small className="history-badge">Superset {String.fromCharCode(64 + numberOf(item.supersetGroupId))}</small>}
            <div className="history-row"><span className="history-row-icon strength" aria-hidden="true">◆</span><span className="history-row-copy"><strong>{item.exercise?.name || `Exercice #${item.exerciseId}`}</strong>
              <small>{item.exerciseSets?.length ? item.exerciseSets.map(set => `${setName(set.setType)} ${frNumber(numberOf(set.weight))} kg × ${numberOf(set.repetitions)}${set.rpe != null ? ` · RPE ${set.rpe}` : ''}`).join(' · ') : 'Aucune série enregistrée'}</small>
              {item.notes && <small>✎ {item.notes}</small>}</span><span aria-hidden="true">›</span></div></NavCard>)}
        </div></section>}</>}
  </Page>
}
