import { durationMinutes } from '../today/todayData'
import type { Cardio, Workout } from '../today/todayData'

export type ProfileData = { workouts: Workout[]; cardio: Cardio[] }

const asDate = (value?: string) => (value ? new Date(value) : new Date(0))
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

export function summarizeProfile(data: ProfileData, now = new Date()) {
  const sessions = [...data.workouts, ...data.cardio]
  const dates = sessions.map(item => asDate(item.date))

  const totalSessions = sessions.length
  const totalMinutes = Math.trunc(
    data.workouts.reduce((sum, item) => sum + durationMinutes(item.duration), 0)
    + data.cardio.reduce((sum, item) => sum + durationMinutes(item.duration), 0),
  )

  const dateKeys = new Set(dates.map(dayKey))
  let streak = 0
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  while (dateKeys.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const memberSince = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null

  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const weekSessions = sessions.filter(item => asDate(item.date) >= monday).length

  return { totalSessions, totalMinutes, streak, memberSince, weekSessions }
}
