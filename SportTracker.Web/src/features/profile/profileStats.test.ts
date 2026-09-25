import { describe, expect, it } from 'vitest'
import { summarizeProfile } from './profileStats'

describe('profile stats', () => {
  it('aggregates totals, current streak, member-since and this-week count', () => {
    const now = new Date(2026, 8, 25, 12)
    const result = summarizeProfile({
      workouts: [
        { id: 1, name: 'Today', date: '2026-09-25T09:00:00', duration: '01:00:00' },
        { id: 2, name: 'Yesterday', date: '2026-09-24T09:00:00', duration: '00:30:00' },
        { id: 3, name: 'First ever', date: '2026-01-05T09:00:00', duration: '00:20:00' },
      ],
      cardio: [{ id: 4, name: 'Run', date: '2026-09-23T08:00:00', duration: '00:20:00' }],
    }, now)

    expect(result.totalSessions).toBe(4)
    expect(result.totalMinutes).toBe(130)
    expect(result.streak).toBe(3)
    expect(result.memberSince).toEqual(new Date('2026-01-05T09:00:00'))
    expect(result.weekSessions).toBe(3)
  })

  it('reports zero streak and no member-since when there is no history', () => {
    const result = summarizeProfile({ workouts: [], cardio: [] })
    expect(result.streak).toBe(0)
    expect(result.memberSince).toBeNull()
    expect(result.weekSessions).toBe(0)
  })

  it('breaks the streak on a gap day', () => {
    const now = new Date(2026, 8, 25, 12)
    const result = summarizeProfile({
      workouts: [
        { id: 1, name: 'Today', date: '2026-09-25T09:00:00', duration: '00:10:00' },
        { id: 2, name: 'Two days ago', date: '2026-09-23T09:00:00', duration: '00:10:00' },
      ],
      cardio: [],
    }, now)
    expect(result.streak).toBe(1)
  })
})
