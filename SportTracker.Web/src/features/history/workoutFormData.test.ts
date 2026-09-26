import { describe, expect, it } from 'vitest'
import { clearFormDraft, formDraftKey, readFormDraft, writeFormDraft } from '../../domain/formDraft'
import type { Workout } from './data'
import {
  emptyForm, formExercise, formFromWorkout, isWorkoutForm, linkWithPrevious, moveExercise, newSet, orderChanged, setCount, supersetLetter,
  unlinkSuperset, validateForm, withoutExercise, workoutPayload,
} from './workoutFormData'

const saved: Workout = {
  id: 7, name: 'Haut du corps', date: '2026-09-16T18:30:00', duration: '01:05:00', workoutProgramSessionId: 3, clientDraftId: null,
  workoutExercises: [
    { id: 11, exerciseId: 1, exercise: { id: 1, name: 'Développé couché', muscleGroups: [0] }, notes: 'Coudes à 45°', supersetGroupId: null,
      exerciseSets: [{ id: 101, weight: 20, repetitions: 12, setType: 0, rpe: 5 }, { id: 102, weight: 60, repetitions: 10, setType: 1, rpe: 8 }] },
    { id: 12, exerciseId: 2, exercise: { id: 2, name: 'Tirage vertical', muscleGroups: [1] }, notes: null, supersetGroupId: null,
      exerciseSets: [{ id: 201, weight: 45, repetitions: 12, setType: 1, rpe: null }] },
  ],
}

describe('workout form (V6 · 05 and 21)', () => {
  it('reads a saved workout with its sets, notes, duration and day', () => {
    const form = formFromWorkout(saved)
    expect(form).toMatchObject({ name: 'Haut du corps', date: '2026-09-16', minutes: 65 })
    expect(form.items.map(item => [item.id, item.exercise?.name, item.notes])).toEqual([[11, 'Développé couché', 'Coudes à 45°'], [12, 'Tirage vertical', '']])
    expect(form.items[0].sets.map(set => [set.id, set.setType, set.weight, set.repetitions, set.rpe])).toEqual([[101, 0, 20, 12, 5], [102, 1, 60, 10, 8]])
    expect(setCount(form)).toBe(3)
  })

  it('edits in place: ids kept, the time of day kept, the carnet link and draft key kept', () => {
    const form = formFromWorkout(saved)
    form.items[0].sets.splice(0, 1)
    const body = workoutPayload(form, saved)
    expect(body).toMatchObject({ id: 7, date: '2026-09-16T18:30:00', duration: '01:05:00', workoutProgramSessionId: 3 })
    expect(body.workoutExercises?.map(item => [item.id, item.exerciseSets?.map(set => set.id)])).toEqual([[11, [102]], [12, [201]]])
  })

  it('sends new rows after a reorder so the server keeps the order', () => {
    const form = moveExercise(formFromWorkout(saved), 1, 0)
    expect(orderChanged(form, saved)).toBe(true)
    const body = workoutPayload(form, saved)
    expect(body.workoutExercises?.map(item => [item.id, item.exerciseId, item.exerciseSets?.map(set => set.id)])).toEqual([[undefined, 2, [undefined]], [undefined, 1, [undefined, undefined]]])
    expect(body.workoutExercises?.[1].exerciseSets?.map(set => set.weight)).toEqual([20, 60])
  })

  it('a new exercise placed above a saved one is also a reorder; one added at the end is not', () => {
    const form = formFromWorkout(saved)
    const added = formExercise({ id: 3, name: 'Écartés poulie' })
    expect(orderChanged({ ...form, items: [...form.items, added] }, saved)).toBe(false)
    expect(orderChanged({ ...form, items: [added, ...form.items] }, saved)).toBe(true)
    expect(orderChanged({ ...form, items: form.items.slice(1) }, saved)).toBe(false)
  })

  it('a new workout has no ids and starts at midnight of its day', () => {
    const form = { ...emptyForm('2026-09-26'), name: ' Jambes ', minutes: 45, items: [formExercise({ id: 5, name: 'Squat' }, 0)] }
    expect(workoutPayload(form)).toEqual({
      name: 'Jambes', date: '2026-09-26T00:00:00', duration: '00:45:00',
      workoutExercises: [{ exerciseId: 5, notes: null, supersetGroupId: null, exerciseSets: [{ weight: 0, repetitions: 10, setType: 0, rpe: null }] }],
    })
  })

  it('a new set copies the previous weight and reps, with the page’s type', () => {
    expect(newSet(2, { key: 'x', weight: 62.5, repetitions: 8, setType: 1, rpe: 9 })).toMatchObject({ weight: 62.5, repetitions: 8, setType: 2, rpe: null })
  })

  it('links an exercise with the one above, then dissolves a superset left with one exercise', () => {
    const three = { ...formFromWorkout(saved), items: [...formFromWorkout(saved).items, formExercise({ id: 3, name: 'Écartés' })] }
    const linked = linkWithPrevious(three, 1)
    expect(linked.items.map(item => item.supersetGroupId)).toEqual([1, 1, null])
    const joined = linkWithPrevious(linked, 2)
    expect(joined.items.map(item => item.supersetGroupId)).toEqual([1, 1, 1])
    expect(unlinkSuperset(joined, 2).items.map(item => item.supersetGroupId)).toEqual([1, 1, null])
    expect(unlinkSuperset(linked, 0).items.map(item => item.supersetGroupId)).toEqual([null, null, null])
    expect(supersetLetter(2)).toBe('B')
    expect(withoutExercise(linked, linked.items[0].key).items.map(item => [item.exercise?.name, item.supersetGroupId])).toEqual([['Tirage vertical', null], ['Écartés', null]])
    expect(withoutExercise(joined, joined.items[0].key).items.map(item => item.supersetGroupId)).toEqual([1, 1])
  })

  it('asks for a name, a duration and at least one rep per set', () => {
    const form = { ...emptyForm('2026-09-26'), minutes: 0, items: [{ ...formExercise({ id: 1 }), sets: [] }] }
    expect(validateForm(form)).toEqual({ name: 'Indique le nom de la séance.', duration: 'La durée doit être d’au moins une minute.', items: 'Chaque exercice doit avoir au moins une série.' })
    expect(validateForm(formFromWorkout(saved))).toEqual({})
  })
})

describe('local form draft', () => {
  const memory = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) } }

  it('is scoped by account and by session', () => {
    expect(formDraftKey('workout', ' Damien@Exemple.fr ', 7)).toBe('st-form-draft:v1:damien@exemple.fr:workout:7')
    expect(formDraftKey('workout', null)).toBe('st-form-draft:v1:anonyme:workout:new')
  })

  it('round-trips a form, ignores foreign values, and clears', () => {
    const storage = memory(), key = formDraftKey('workout', 'a@b.fr')
    const form = formFromWorkout(saved)
    expect(writeFormDraft(storage, key, form, new Date('2026-09-26T10:04:00Z'))?.savedAt).toBe('2026-09-26T10:04:00.000Z')
    expect(readFormDraft(storage, key, isWorkoutForm)?.value).toEqual(form)
    storage.setItem(key, JSON.stringify({ value: { name: 3 }, savedAt: '2026-09-26T10:04:00Z' }))
    expect(readFormDraft(storage, key, isWorkoutForm)).toBeNull()
    storage.setItem(key, '{oops')
    expect(readFormDraft(storage, key, isWorkoutForm)).toBeNull()
    clearFormDraft(storage, key)
    expect(storage.getItem(key)).toBeNull()
  })

  it('reports a storage that refuses the write', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('quota') }, removeItem: () => {} }
    expect(writeFormDraft(full, 'k', emptyForm('2026-09-26'))).toBeNull()
  })
})
