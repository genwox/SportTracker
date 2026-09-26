import { describe, expect, it, vi } from 'vitest'
import { createLongPress } from '../../domain/longPress'
import {
  activeProgramId, doneThisWeek, duplicateProgram, formatRestLong, lastSetsOf, moveItem, nextSession, programTotals, programWeek,
  programPayload, sessionStatus, setTypeBadge, supersetNames, supersetsOf, weekStart, withSession, type Program, type Workout,
} from './programData'

const wednesday = new Date(2026, 8, 16, 18, 0)
const program: Program = {
  id: 3, name: 'Push Pull Legs', colorHex: '#4A90D9', sessions: [
    { id: 11, name: 'Legs', order: 2, exercises: [{ id: 5, exerciseId: 9, order: 0, targetSets: 4, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 }] },
    { id: 10, name: 'Pull', order: 1, exercises: [{ id: 3, exerciseId: 7, order: 0, targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 90 }] },
    { id: 12, name: 'Push', order: 0, exercises: [
      { id: 1, exerciseId: 1, order: 0, targetSets: 4, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 0 },
      { id: 2, exerciseId: 2, order: 1, targetSets: 4, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 90 },
    ] },
  ],
}
const workouts: Workout[] = [
  { id: 1, name: 'Push', date: '2026-09-14T18:00:00', workoutProgramSessionId: 12, workoutExercises: [
    { exerciseId: 1, supersetGroupId: 1, exerciseSets: [{ weight: 20, repetitions: 12, setType: 0 }, { weight: 60, repetitions: 10, setType: 1 }] },
    { exerciseId: 2, supersetGroupId: 1, exerciseSets: [{ weight: 50, repetitions: 8, setType: 2 }] },
  ] },
  { id: 2, name: 'Pull', date: '2026-09-08T18:00:00', workoutProgramSessionId: 10 },
  { id: 3, name: 'Libre', date: '2026-09-15T18:00:00' },
]

describe('Carnets · V5 data derived from the API', () => {
  it('starts the week on Monday', () => {
    expect(weekStart(wednesday)).toEqual(new Date(2026, 8, 14))
    expect(weekStart(new Date(2026, 8, 20, 23))).toEqual(new Date(2026, 8, 14))
  })
  it('marks a session done when a linked workout is dated this week', () => {
    const done = doneThisWeek(workouts, wednesday)
    expect([...done]).toEqual([12])
    expect(sessionStatus(program.sessions![2], done)).toBe('done')
    expect(sessionStatus(program.sessions![1], done)).toBe('todo')
    expect(programWeek(program, done)).toEqual({ done: 1, total: 3, percent: 33 })
  })
  it('suggests the first session in order that is still to do', () => {
    expect(nextSession(program, doneThisWeek(workouts, wednesday))?.name).toBe('Pull')
    expect(nextSession(program, new Set([10, 11, 12]))?.name).toBe('Push')
    expect(nextSession({ sessions: [] }, new Set())).toBeUndefined()
  })
  it('flags as active the programme of the latest linked workout', () => {
    expect(activeProgramId([program, { id: 4, sessions: [{ id: 20 }] }], workouts)).toBe(3)
    expect(activeProgramId([program], [workouts[2]])).toBeNull()
  })
  it('reads supersets and set-type badges from the latest workout', () => {
    expect(supersetsOf(workouts[0]).get(2)).toBe('A')
    expect(supersetNames(workouts[0])).toEqual(['A'])
    expect(lastSetsOf(workouts[0], 1).map(set => `${set.type.label} ${set.weight}×${set.repetitions}`)).toEqual(['Éch. 20×12', 'Normal 60×10'])
    expect(setTypeBadge('Failure').label).toBe('Échec')
    expect(setTypeBadge(undefined).label).toBe('Normal')
  })
  it('counts sessions, exercises and target sets', () => {
    expect(programTotals(program)).toEqual({ sessions: 3, exercises: 4, sets: 15 })
  })
})

describe('Carnets · editing', () => {
  it('moves an item without mutating the list', () => {
    const list = ['a', 'b', 'c', 'd']
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
    expect(moveItem(list, 0, 3)).toEqual(['b', 'c', 'd', 'a'])
    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })
  it('formats the rest like iOS', () => {
    expect(formatRestLong(45)).toBe('45 s')
    expect(formatRestLong(90)).toBe('1 min 30 s')
    expect(formatRestLong(120)).toBe('2 min')
  })
  it('replaces an edited session and renumbers its exercises', () => {
    const push = program.sessions![2]
    const edited = withSession(program, { ...push, exercises: moveItem(push.exercises!, 1, 0) })
    const saved = edited.sessions!.find(session => session.id === 12)!
    expect(saved.exercises!.map(exercise => [exercise.exerciseId, exercise.order])).toEqual([[2, 0], [1, 1]])
    expect(edited.sessions).toHaveLength(3)
    const body = programPayload({ ...edited, sessions: [{ ...saved, exercises: [{ ...saved.exercises![0], exercise: { id: 2, name: 'Tirage' } }] }] })
    expect(body.sessions![0].exercises![0]).toMatchObject({ exerciseId: 2, order: 0, exercise: null })
  })
  it('appends a new session at the end of the programme', () => {
    const edited = withSession(program, { name: 'Bras', exercises: [] })
    expect(edited.sessions!.at(-1)).toMatchObject({ name: 'Bras', order: 3, workoutProgramId: 3 })
  })
  it('duplicates a programme without ids', () => {
    const copy = duplicateProgram(program)
    expect(copy.name).toBe('Push Pull Legs (copie)')
    expect(copy.id).toBeUndefined()
    expect(copy.sessions!.map(session => session.name)).toEqual(['Push', 'Pull', 'Legs'])
    expect(copy.sessions![0].exercises![1]).not.toHaveProperty('id')
  })
})

describe('long press (context menu)', () => {
  it('fires after 500 ms held still, then swallows the click', () => {
    vi.useFakeTimers()
    const open = vi.fn()
    const press = createLongPress(open)
    press.start(10, 10)
    vi.advanceTimersByTime(499)
    expect(open).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(open).toHaveBeenCalledOnce()
    expect(press.consumeClick()).toBe(true)
    expect(press.consumeClick()).toBe(false)
    vi.useRealTimers()
  })
  it('is cancelled by scrolling or an early release', () => {
    vi.useFakeTimers()
    const open = vi.fn()
    const press = createLongPress(open)
    press.start(10, 10); press.move(14, 30); vi.advanceTimersByTime(600)
    press.start(10, 10); press.cancel(); vi.advanceTimersByTime(600)
    expect(open).not.toHaveBeenCalled()
    expect(press.consumeClick()).toBe(false)
    press.start(10, 10); press.move(15, 14); vi.advanceTimersByTime(500)
    expect(open).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})
