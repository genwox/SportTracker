import { describe, expect, it } from 'vitest'
import { durationMinutes, maxOneRm, muscleCounts, weeklySetCounts, workoutVolume, type HistoryEntry, type Workout } from './data'

describe('history summaries', () => {
  it('parses API TimeSpan values including days and seconds', () => {
    expect(durationMinutes('01:30:00')).toBe(90)
    expect(durationMinutes('1.02:15:30')).toBe(1575.5)
  })

  it('uses the shared unrounded 1RM and includes warmup sets', () => {
    const entry: HistoryEntry = { date: '2026-09-25', totalReps: 12, totalVolume: 800,
      sets: [{ order: 1, weight: 120, repetitions: 2, setType: 0 }, { order: 2, weight: 80, repetitions: 10, setType: 1 }] }
    expect(maxOneRm(entry)).toBeCloseTo(120 * (1 + 2 / 30), 8)
  })

  it('counts all exercise sets for each distinct muscle and sums workout volume', () => {
    const workout = { workoutExercises: [
      { exercise: { muscleGroups: [0, 1, 0] }, exerciseSets: [{ weight: 50, repetitions: 8 }, { weight: 60, repetitions: 6 }] },
      { exercise: { muscleGroups: [0] }, exerciseSets: [{ weight: 30, repetitions: 10 }] },
    ] } as Workout
    expect(workoutVolume(workout)).toBe(1060)
    expect(muscleCounts([workout]).map(item => [item.label, item.count])).toEqual([['Pecs', 3], ['Dos', 2]])
  })

  it('groups logged sets by Monday week', () => {
    const sessions = [
      { date: '2026-09-14T10:00:00', workoutExercises: [{ exerciseSets: [{}, {}] }] },
      { date: '2026-09-20T10:00:00', workoutExercises: [{ exerciseSets: [{}] }] },
      { date: '2026-09-21T10:00:00', workoutExercises: [{ exerciseSets: [{}] }] },
    ] as Workout[]
    expect(weeklySetCounts(sessions, new Date(2026, 8, 21), 2).map(week => week.count)).toEqual([3, 1])
  })
})
