import { describe, expect, it } from 'vitest'
import { durationMinutes, summarizeToday } from './todayData'

describe('Today summary', () => {
  it('computes the Monday to Sunday chart, volume and duration from both activities', () => {
    const now = new Date(2026, 8, 25, 12)
    const result = summarizeToday({
      workouts: [
        { id: 1, name: 'Today', date: '2026-09-25T09:00:00', duration: '01:30:00', workoutExercises: [{ exerciseSets: [{ weight: 100, repetitions: 10 }] }] },
        { id: 2, name: 'Monday', date: '2026-09-21T10:00:00', duration: '00:45:00' },
        { id: 3, name: 'Old', date: '2026-09-20T10:00:00', duration: '00:40:00' },
      ],
      cardio: [{ id: 4, name: 'Run', date: '2026-09-25T08:00:00', duration: '00:20:00' }],
    }, now)
    expect(result.todayWorkout?.name).toBe('Today')
    expect(result.todayCardio?.name).toBe('Run')
    expect(result.suggestedWorkout?.name).toBe('Monday')
    expect(result.weekCount).toBe(3)
    expect(result.volume).toEqual({ value: '1', unit: 't' })
    expect(result.weekTime).toBe('2h35')
    expect(result.weekData.map(day => day.count)).toEqual([1, 0, 0, 0, 2, 0, 0])
  })
  it('parses TimeSpan days', () => expect(durationMinutes('1.02:03:00')).toBe(1563))
})
