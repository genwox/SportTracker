import { describe, expect, it } from 'vitest'
import type { Cardio, Workout } from './data'
import {
  cardioRecords, cardioTotals, duplicateCardio, duplicateWorkout, durationParts, exerciseBlocks, inPeriod, isoWeek, matchesMuscle, minutesLabel,
  paceLabel, parseDecimal, periodOptions, setKey, setTypeCounts, toTimeSpan, tonnage, weeklyTotals, workoutRecords,
} from './historyData'

const set = (weight: number, repetitions: number, setType = 1) => ({ weight, repetitions, setType })
const workout = (id: number, date: string, exercises: { exerciseId: number; sets: ReturnType<typeof set>[]; group?: number; muscles?: number[] }[]): Workout => ({
  id, date, name: `Séance ${id}`, workoutExercises: exercises.map(item => ({
    exerciseId: item.exerciseId, supersetGroupId: item.group ?? null, exercise: { id: item.exerciseId, muscleGroups: item.muscles ?? [] }, exerciseSets: item.sets,
  })),
})

describe('workout records', () => {
  it('stars the best set of an exercise when it beats every earlier session, never the first session', () => {
    const first = workout(1, '2026-09-01T10:00:00', [{ exerciseId: 7, sets: [set(60, 10)] }])
    const second = workout(2, '2026-09-08T10:00:00', [{ exerciseId: 7, sets: [set(20, 12, 0), set(65, 10), set(70, 8)] }, { exerciseId: 8, sets: [set(40, 10)] }])
    const third = workout(3, '2026-09-15T10:00:00', [{ exerciseId: 7, sets: [set(60, 10)] }])
    const records = workoutRecords([third, second, first])
    expect(records.get(1)?.count).toBe(0)
    // 70 × 8 → 88,7 beats 65 × 10 → 86,7 and 60 × 10 → 80; exercise 8 is a first session.
    expect(records.get(2)?.count).toBe(1)
    expect([...records.get(2)!.sets]).toEqual([setKey(0, 2)])
    expect(records.get(3)?.count).toBe(0)
  })

  it('counts set types in V5 order', () => {
    const session = workout(1, '2026-09-01', [{ exerciseId: 1, sets: [set(60, 10), set(20, 12, 0), set(40, 8, 2), set(60, 10), set(50, 6, 3)] }])
    expect(setTypeCounts(session).map(item => [item.type.label, item.count])).toEqual([['Éch.', 1], ['Normal', 2], ['Drop', 1], ['Échec', 1]])
  })

  it('groups consecutive exercises of one superset into a block', () => {
    const session = workout(1, '2026-09-01', [{ exerciseId: 1, sets: [], group: 1 }, { exerciseId: 2, sets: [], group: 1 }, { exerciseId: 3, sets: [] }, { exerciseId: 4, sets: [], group: 2 }])
    expect(exerciseBlocks(session.workoutExercises!).map(block => [block.group, block.items.map(item => item.index)])).toEqual([[1, [0, 1]], [0, [2]], [2, [3]]])
  })

  it('filters workouts by muscle group (Bras = biceps + triceps)', () => {
    const arms = workout(1, '2026-09-01', [{ exerciseId: 1, sets: [], muscles: [4] }])
    expect(matchesMuscle(arms, 'arms')).toBe(true)
    expect(matchesMuscle(arms, 'chest')).toBe(false)
    expect(matchesMuscle(arms, 'all')).toBe(true)
  })

  it('shows tonnes from 1 000 kg', () => {
    expect(tonnage(840)).toBe('840 kg')
    expect(tonnage(8400)).toBe('8,4 T')
  })

  it('duplicates a workout dated now, without its carnet link, ids or draft key', () => {
    const source = { ...workout(9, '2026-09-01T10:00:00', [{ exerciseId: 1, sets: [set(60, 10)] }]), workoutProgramSessionId: 12, clientDraftId: 'x' }
    const copy = duplicateWorkout(source, new Date(2026, 8, 26, 18, 30))
    expect(copy).toMatchObject({ name: 'Séance 9', date: '2026-09-26T18:30:00', workoutProgramSessionId: null, clientDraftId: null })
    expect(copy.id).toBeUndefined()
    expect(copy.workoutExercises?.[0].exerciseSets).toEqual([{ weight: 60, repetitions: 10, setType: 1, rpe: undefined }])
  })
})

describe('history periods and weeks', () => {
  it('offers the three latest months, then earlier years', () => {
    const options = periodOptions(['2026-09-16T10:00:00', '2026-08-02T10:00:00', '2026-07-10T10:00:00', '2026-06-01T10:00:00', '2025-12-01T10:00:00'])
    expect(options.map(option => option.label)).toEqual(['Septembre', 'Août', 'Juillet', '2026', '2025'])
    expect(inPeriod('2026-09-16T10:00:00', '2026-09', options)).toBe(true)
    // The year chip keeps the months that have no chip of their own.
    expect(inPeriod('2026-06-01T10:00:00', '2026', options)).toBe(true)
    expect(inPeriod('2026-09-16T10:00:00', '2026', options)).toBe(false)
    expect(inPeriod('2026-06-01T10:00:00', null, options)).toBe(true)
  })

  it('numbers ISO weeks and totals the last weeks, current one last', () => {
    expect(isoWeek(new Date(2026, 8, 21))).toBe(39)
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1)
    const weeks = weeklyTotals([{ date: '2026-09-21T08:00:00' }, { date: '2026-09-23T08:00:00' }, { date: '2026-09-15T08:00:00' }], () => 1, 3, new Date(2026, 8, 26))
    expect(weeks.map(week => [week.label, week.value, week.current])).toEqual([['S37', 0, false], ['S38', 1, false], ['S39', 2, true]])
  })
})

describe('cardio', () => {
  const outing = (id: number, date: string, type: number, distance: number, duration = '00:42:00'): Cardio => ({ id, date, type, distance, duration, name: '' })

  it('marks an outing that goes further than every earlier one of its activity', () => {
    const records = cardioRecords([outing(3, '2026-09-16', 0, 8.2), outing(1, '2026-09-01', 0, 5), outing(2, '2026-09-08', 0, 7.1), outing(4, '2026-09-10', 3, 30), outing(5, '2026-09-12', 0, 6)])
    expect([...records.keys()]).toEqual([2, 3])
    expect(records.get(3)).toBeCloseTo(1.1)
  })

  it('computes pace, totals and duration labels', () => {
    expect(paceLabel(42, 8.2)).toBe('5:07')
    expect(paceLabel(42, 0)).toBe('')
    expect(cardioTotals([outing(1, '', 0, 8.2), outing(2, '', 0, 1.8, '00:08:00')])).toEqual({ km: 10, minutes: 50, pace: '5:00' })
    expect(minutesLabel(42)).toBe('42 min')
    expect(minutesLabel(310)).toBe('5 h 10')
  })

  it('round-trips the wheel duration with the API TimeSpan', () => {
    expect(durationParts('01:05:00')).toEqual({ hours: 1, minutes: 5 })
    expect(toTimeSpan(1, 5)).toBe('01:05:00')
  })

  it('reads decimals with a comma or a dot', () => {
    expect(parseDecimal('8,2')).toBe(8.2)
    expect(parseDecimal(' 12 ')).toBe(12)
    expect(parseDecimal('')).toBe(0)
    expect(parseDecimal('huit')).toBeNaN()
    expect(parseDecimal('-3')).toBeNaN()
  })

  it('duplicates an outing dated now, without its id', () => {
    const copy = duplicateCardio({ ...outing(4, '2026-09-10T07:00:00', 3, 30), name: 'Vélo', elevationGain: 120 }, new Date(2026, 8, 26, 7, 5))
    expect(copy).toEqual({ name: 'Vélo', type: 3, date: '2026-09-26T07:05:00', duration: '00:42:00', distance: 30, elevationGain: 120 })
  })
})
