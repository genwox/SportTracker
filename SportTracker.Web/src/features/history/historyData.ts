import { estimateOneRm } from '../../domain/strengthMath'
import { setTypeBadge, weekStart } from '../programs/programData'
import { cardioName, durationMinutes, frNumber, localDay, numberOf, type Cardio, type Workout, type WorkoutExercise } from './data'

/*
 * V5 data of the Historique screens (V6 lot 4), derived from what the API already stores (no new model):
 * - a set is a record (★) when it is the best set of its exercise in the session and beats every earlier session;
 * - a cardio outing is a record when it goes further than every earlier outing of the same activity;
 * - filters (muscle, period, activity) and weekly bars are computed from the cached lists.
 */

const time = (value?: string) => value ? new Date(value).getTime() : 0
const byDate = <T extends { date?: string }>(items: readonly T[]) => [...items].sort((a, b) => time(a.date) - time(b.date))
export const newestFirst = <T extends { date?: string }>(items: readonly T[]) => byDate(items).reverse()

/* ── Strength records ────────────────────────────────────────────────────── */

export type WorkoutRecords = { count: number; sets: Set<string> }
/** Key of a set inside a workout: exercise position + set position. */
export const setKey = (exerciseIndex: number, setIndex: number) => `${exerciseIndex}:${setIndex}`

/**
 * Records of every workout, walking them in date order (same 1RM as the live PR detection).
 * A first-ever session of an exercise sets a baseline, not a record.
 */
export function workoutRecords(workouts: readonly Workout[]): Map<number, WorkoutRecords> {
  const best = new Map<number, number>()
  const result = new Map<number, WorkoutRecords>()
  for (const workout of byDate(workouts)) {
    const records: WorkoutRecords = { count: 0, sets: new Set() }
    const sessionBest = new Map<number, number>()
    ;(workout.workoutExercises ?? []).forEach((exercise, exerciseIndex) => {
      const exerciseId = numberOf(exercise.exerciseId)
      let top = { index: -1, value: 0 }
      ;(exercise.exerciseSets ?? []).forEach((set, setIndex) => {
        const value = estimateOneRm(numberOf(set.weight), numberOf(set.repetitions), false)
        if (value > top.value) top = { index: setIndex, value }
      })
      const previous = best.get(exerciseId) ?? 0
      if (top.index >= 0 && previous > 0 && top.value > previous + 0.05) {
        records.sets.add(setKey(exerciseIndex, top.index))
        records.count++
      }
      sessionBest.set(exerciseId, Math.max(sessionBest.get(exerciseId) ?? 0, top.value))
    })
    sessionBest.forEach((value, exerciseId) => best.set(exerciseId, Math.max(best.get(exerciseId) ?? 0, value)))
    result.set(numberOf(workout.id), records)
  }
  return result
}

/* ── Workout summaries ───────────────────────────────────────────────────── */

export const workoutSets = (workout: Workout) => (workout.workoutExercises ?? []).flatMap(exercise => exercise.exerciseSets ?? [])

/** « Éch. ×2 · Normal ×14 · Drop ×2 »: set-type counts in V5 order, empty types left out. */
export function setTypeCounts(workout: Workout) {
  const counts = new Map<string, { type: ReturnType<typeof setTypeBadge>; count: number }>()
  for (const set of workoutSets(workout)) {
    const type = setTypeBadge(set.setType)
    counts.set(type.key, { type, count: (counts.get(type.key)?.count ?? 0) + 1 })
  }
  return ['Warmup', 'Normal', 'DropSet', 'Failure'].flatMap(key => counts.get(key) ?? [])
}

/** Kilograms as the design shows them: « 840 kg », then tonnes from 1 000 kg (« 8,4 T »). */
export const tonnage = (kg: number) => kg >= 1000 ? `${frNumber(kg / 1000)} T` : `${frNumber(kg, 0)} kg`
/** The same, split for a stat tile: { value: '8,4', unit: 'T' }. */
export const tonnageParts = (kg: number) => kg >= 1000 ? { value: frNumber(kg / 1000), unit: 'T' } : { value: frNumber(kg, 0), unit: 'kg' }

export const plural = (count: number, word: string, many = `${word}s`) => `${count} ${count > 1 ? many : word}`

/** Exercises of a workout in blocks: consecutive exercises of one superset group share a block. */
export function exerciseBlocks(exercises: readonly WorkoutExercise[]) {
  const blocks: { group: number; items: { exercise: WorkoutExercise; index: number }[] }[] = []
  exercises.forEach((exercise, index) => {
    const group = numberOf(exercise.supersetGroupId)
    const last = blocks.at(-1)
    if (group > 0 && last?.group === group) last.items.push({ exercise, index })
    else blocks.push({ group, items: [{ exercise, index }] })
  })
  return blocks
}

/* ── Muscle filter (04) ──────────────────────────────────────────────────── */

export const muscleFilters = [
  { value: 'all', label: 'Tous', groups: [] },
  { value: 'chest', label: 'Pecs', groups: [0] },
  { value: 'back', label: 'Dos', groups: [1] },
  { value: 'legs', label: 'Jambes', groups: [5, 6] },
  { value: 'shoulders', label: 'Épaules', groups: [2] },
  { value: 'arms', label: 'Bras', groups: [3, 4] },
  { value: 'abs', label: 'Abdos', groups: [7] },
] as const
export type MuscleFilter = typeof muscleFilters[number]['value']

const muscleNames = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Glutes', 'Abs', 'FullBody']
const muscleId = (value: number | string) => typeof value === 'string' && Number.isNaN(Number(value)) ? muscleNames.indexOf(value) : Number(value)

export function matchesMuscle(workout: Workout, filter: MuscleFilter) {
  const groups: readonly number[] = muscleFilters.find(option => option.value === filter)?.groups ?? []
  if (!groups.length) return true
  return (workout.workoutExercises ?? []).some(item => (item.exercise?.muscleGroups ?? []).some(group => groups.includes(muscleId(group))))
}

/* ── Period filter (17) ──────────────────────────────────────────────────── */

export type Period = { value: string; label: string }

/** Chips of the history: the three latest months with a session, then each earlier year. */
export function periodOptions(dates: readonly string[]): Period[] {
  const months = [...new Set(dates.filter(Boolean).map(date => localDay(date).slice(0, 7)))].sort().reverse()
  const recent = months.slice(0, 3)
  const years = [...new Set(months.slice(3).map(month => month.slice(0, 4)))]
  const monthLabel = (month: string) => {
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(`${month}-15T12:00:00`))
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return [...recent.map(month => ({ value: month, label: monthLabel(month) })), ...years.map(year => ({ value: year, label: year }))]
    .filter((option, index, all) => all.findIndex(other => other.label === option.label) === index)
}

/** A month chip (« 2026-09 ») keeps that month; a year chip keeps what is left of the year after the month chips. */
export function inPeriod(date: string | undefined, period: string | null, options: readonly Period[] = []) {
  if (!period) return true
  const month = localDay(date ?? '').slice(0, 7)
  if (period.length === 7) return month === period
  return month.startsWith(period) && !options.some(option => option.value.length === 7 && option.value === month)
}

/* ── Weeks ───────────────────────────────────────────────────────────────── */

/** ISO week number (« S39 »). */
export function isoWeek(date: Date) {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1))
  return Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/** The `count` last weeks (oldest first) with the value of their items; the last one is the current week. */
export function weeklyTotals<T extends { date?: string }>(items: readonly T[], value: (item: T) => number, count = 6, now = new Date()) {
  const current = weekStart(now)
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(current)
    start.setDate(start.getDate() - (count - 1 - index) * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const from = start.toLocaleDateString('sv-SE'), until = end.toLocaleDateString('sv-SE')
    const total = items.filter(item => localDay(item.date ?? '') >= from && localDay(item.date ?? '') < until).reduce((sum, item) => sum + value(item), 0)
    return { start: from, label: `S${isoWeek(start)}`, value: total, current: index === count - 1 }
  })
}

/* ── Cardio ──────────────────────────────────────────────────────────────── */

export const cardioTypes = [0, 3, 2, 1] as const // Course, Vélo, Natation, Marche: the order of the activity segment

/** Outings further than every earlier outing of the same activity (the first one of an activity is a baseline). */
export function cardioRecords(sessions: readonly Cardio[]): Map<number, number> {
  const best = new Map<number, number>()
  const records = new Map<number, number>()
  for (const session of byDate(sessions)) {
    const type = numberOf(session.type), distance = numberOf(session.distance)
    const previous = best.get(type)
    if (previous != null && previous > 0 && distance > previous) records.set(numberOf(session.id), distance - previous)
    if (distance > (previous ?? 0)) best.set(type, distance)
    else if (previous == null) best.set(type, distance)
  }
  return records
}

/** Minutes per kilometre as « 5:07 » (empty without distance). */
export function paceLabel(minutes: number, km: number) {
  if (!(km > 0) || !(minutes > 0)) return ''
  const seconds = Math.round(minutes * 60 / km)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function cardioTotals(sessions: readonly Cardio[]) {
  const km = sessions.reduce((sum, session) => sum + numberOf(session.distance), 0)
  const minutes = sessions.reduce((sum, session) => sum + durationMinutes(session.duration), 0)
  return { km, minutes, pace: paceLabel(minutes, km) }
}

/** « 42 min », « 1 h 05 », « 5 h 10 ». */
export function minutesLabel(total: number) {
  const minutes = Math.round(total)
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`
}

export const cardioTitle = (session: Cardio) => session.name || cardioName(session.type)

/** Hours and minutes of an API TimeSpan (the cardio wheel). */
export function durationParts(value?: string | null) {
  const minutes = Math.round(durationMinutes(value))
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 }
}

/** TimeSpan « hh:mm:00 » for the API. */
export const toTimeSpan = (hours: number, minutes: number) => `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`

/** « 8,2 » or « 8.2 » → 8.2; empty → 0; anything else → NaN. */
export function parseDecimal(value: string) {
  const text = value.trim().replace(',', '.')
  return text === '' ? 0 : /^\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN
}

/* ── Duplicates ──────────────────────────────────────────────────────────── */

/** Local « now » as the API stores dates (no zone). */
const nowStamp = (now: Date) => `${now.toLocaleDateString('sv-SE')}T${now.toTimeString().slice(0, 8)}`

/** Same exercises and sets, dated now, not linked to a carnet session nor to a live draft. */
export function duplicateWorkout(workout: Workout, now = new Date()): Workout {
  return {
    name: workout.name, date: nowStamp(now), duration: workout.duration, workoutProgramSessionId: null, clientDraftId: null,
    workoutExercises: (workout.workoutExercises ?? []).map(exercise => ({
      exerciseId: exercise.exerciseId, notes: exercise.notes, supersetGroupId: exercise.supersetGroupId,
      exerciseSets: (exercise.exerciseSets ?? []).map(set => ({ weight: set.weight, repetitions: set.repetitions, setType: set.setType, rpe: set.rpe })),
    })),
  }
}

export function duplicateCardio(session: Cardio, now = new Date()): Cardio {
  return { name: session.name, type: session.type, date: nowStamp(now), duration: session.duration, distance: session.distance, elevationGain: session.elevationGain }
}
