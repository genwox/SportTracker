import type { components } from '../../api/schema'

export type Workout = components['schemas']['WorkoutSession']
export type Cardio = components['schemas']['CardioSession']
export type TodayData = { workouts: Workout[]; cardio: Cardio[] }

const asDate = (value?: string) => value ? new Date(value) : new Date(0)
const localDay = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

export function durationMinutes(value?: string): number {
  if (!value) return 0
  const match = /^(?:(\d+)\.)?(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value)
  if (!match) return 0
  return Number(match[1] || 0) * 1440 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4] || 0) / 60
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`
}

export function formatVolume(kg: number): { value: string; unit: string } {
  if (kg >= 1000) return { value: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(kg / 1000), unit: 't' }
  return { value: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(kg), unit: 'kg' }
}

export function summarizeToday(data: TodayData, now = new Date()) {
  const today = localDay(now)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const inWeek = (value?: string) => {
    const date = asDate(value)
    return date >= start && date < tomorrow
  }
  const latest = <T extends { date?: string }>(items: T[]) => [...items].sort((a, b) => asDate(b.date).getTime() - asDate(a.date).getTime())[0]
  const todayWorkout = latest(data.workouts.filter(item => localDay(asDate(item.date)) === today))
  const todayCardio = latest(data.cardio.filter(item => localDay(asDate(item.date)) === today))
  const suggestedWorkout = latest(data.workouts.filter(item => localDay(asDate(item.date)) !== today))
  const weekWorkouts = data.workouts.filter(item => inWeek(item.date))
  const weekCardio = data.cardio.filter(item => inWeek(item.date))
  const volumeKg = weekWorkouts.flatMap(item => item.workoutExercises || []).flatMap(item => item.exerciseSets || [])
    .reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.repetitions || 0), 0)
  const totalMinutes = Math.trunc(weekWorkouts.reduce((sum, item) => sum + durationMinutes(item.duration), 0))
    + Math.trunc(weekCardio.reduce((sum, item) => sum + durationMinutes(item.duration), 0))
  const weekData = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    const key = localDay(day)
    return { label, count: [...data.workouts, ...data.cardio].filter(item => localDay(asDate(item.date)) === key).length, isToday: key === today }
  })
  return { todayWorkout, todayCardio, suggestedWorkout, weekCount: weekWorkouts.length + weekCardio.length,
    volume: formatVolume(volumeKg), weekTime: formatDuration(totalMinutes), weekData }
}
