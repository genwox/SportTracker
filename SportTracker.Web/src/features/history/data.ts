import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { components } from '../../api/schema'
import { estimateOneRm } from '../../domain/strengthMath'

export type Workout = components['schemas']['WorkoutSession']
export type Cardio = components['schemas']['CardioSession']
export type WorkoutExercise = components['schemas']['WorkoutExercise']
export type ExerciseSet = components['schemas']['ExerciseSet']
export type Exercise = components['schemas']['Exercise']
export type HistoryEntry = { date: string; totalReps: number; totalVolume: number; sets: (ExerciseSet & { order: number })[] }

export const numberOf = (value: number | string | null | undefined) => Number(value ?? 0) || 0
export const workoutsKey = ['history', 'workouts'] as const
export const cardioKey = ['history', 'cardio'] as const
export const workoutsQuery = () => apiRequest<Workout[]>('api/workoutsessions')
export const cardioQuery = () => apiRequest<Cardio[]>('api/cardiosessions')
export const useWorkouts = () => useQuery({ queryKey: workoutsKey, queryFn: workoutsQuery })
export const useCardio = () => useQuery({ queryKey: cardioKey, queryFn: cardioQuery })

// TimeSpan is serialized by System.Text.Json as [d.]hh:mm:ss[.fffffff].
export function durationMinutes(value?: string | null): number {
  const match = /^(?:(\d+)\.)?(\d+):(\d+):(\d+)/.exec(value ?? '')
  return match ? numberOf(match[1]) * 1440 + numberOf(match[2]) * 60 + numberOf(match[3]) + numberOf(match[4]) / 60 : 0
}

export const frNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits }).format(value)
export const dayLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat('fr-FR', options).format(new Date(date))
export const localDay = (date: string) => date.slice(0, 10)
export const cardioName = (type?: number) => ['Course', 'Marche', 'Natation', 'Vélo'][type ?? 0] ?? 'Cardio'
export const setName = (type?: number) => ['Éch.', 'Normal', 'Drop', 'Échec'][type ?? 1] ?? 'Normal'
export const workoutVolume = (session: Workout) => (session.workoutExercises ?? [])
  .flatMap(exercise => exercise.exerciseSets ?? [])
  .reduce((sum, set) => sum + numberOf(set.weight) * numberOf(set.repetitions), 0)
export const maxOneRm = (entry: HistoryEntry) => Math.max(0, ...entry.sets.map(set =>
  estimateOneRm(numberOf(set.weight), numberOf(set.repetitions), false)))

const muscles = [
  { id: 0, label: 'Pecs', color: '#17374a' }, { id: 1, label: 'Dos', color: '#d4f53c' },
  { id: 5, label: 'Jambes', color: '#24495b' }, { id: 2, label: 'Épaules', color: '#527181' },
  { id: 3, label: 'Biceps', color: '#75a0a5' }, { id: 4, label: 'Triceps', color: '#92b8b6' },
  { id: 6, label: 'Fessiers', color: '#a8c9c3' }, { id: 7, label: 'Abdos', color: '#bedbd3' },
  { id: 8, label: 'Corps entier', color: '#d7eae5' },
] as const

export function muscleCounts(sessions: Workout[]) {
  const counts = new Map<number, number>()
  sessions.forEach(session => (session.workoutExercises ?? []).forEach(item => {
    if (!item.exercise) return
    new Set(item.exercise.muscleGroups ?? []).forEach(group =>
      counts.set(group, (counts.get(group) ?? 0) + (item.exerciseSets?.length ?? 0)))
  }))
  return muscles.map(muscle => ({ ...muscle, count: counts.get(muscle.id) ?? 0 })).filter(muscle => muscle.count > 0)
}

export function weeklySetCounts(sessions: Workout[], currentMonday: Date, count = 6) {
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(currentMonday)
    start.setDate(start.getDate() - (count - 1 - index) * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const from = start.toLocaleDateString('sv-SE'), until = end.toLocaleDateString('sv-SE')
    return { start: from, count: sessions.filter(session => localDay(session.date ?? '') >= from && localDay(session.date ?? '') < until)
      .flatMap(session => session.workoutExercises ?? [])
      .reduce((total, exercise) => total + (exercise.exerciseSets?.length ?? 0), 0) }
  })
}
