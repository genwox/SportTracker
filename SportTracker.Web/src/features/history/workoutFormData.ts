import { moveItem } from '../programs/programData'
import { durationMinutes, numberOf, type Exercise, type Workout } from './data'

/*
 * Form of a dated workout: « Nouvelle séance » (V6 · 05) and « Modifier la séance » (V6 · 21).
 * Same data as V5 (sets with type, weight, reps, RPE; notes; supersets), kept as a plain JSON value so it can
 * live in a local draft. The API has no exercise order: when the order changes, the exercises are sent as new
 * rows (no ids) so the server recreates them in that order and deletes the old ones.
 */

export type FormSet = { key: string; id?: number; weight: number; repetitions: number; setType: number; rpe: number | null }
export type ExerciseLite = Pick<Exercise, 'name' | 'gifUrl' | 'instructionsFr' | 'equipment'> & { id?: number | string; muscleGroups?: (number | string)[] | null }
export type FormExercise = {
  key: string; id?: number; exerciseId: number; exercise: ExerciseLite | null; notes: string; supersetGroupId: number | null; sets: FormSet[]
}
export type WorkoutForm = { name: string; date: string; minutes: number; items: FormExercise[] }

let sequence = 0
export const newKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++sequence}`

const lite = (exercise?: Exercise | ExerciseLite | null): ExerciseLite | null => exercise
  ? { id: exercise.id, name: exercise.name, gifUrl: exercise.gifUrl, instructionsFr: exercise.instructionsFr, equipment: exercise.equipment, muscleGroups: exercise.muscleGroups }
  : null

export const emptyForm = (date: string): WorkoutForm => ({ name: '', date, minutes: 60, items: [] })

export function formFromWorkout(workout: Workout): WorkoutForm {
  return {
    name: workout.name ?? '',
    date: (workout.date ?? '').slice(0, 10),
    minutes: Math.max(1, Math.round(durationMinutes(workout.duration))),
    items: (workout.workoutExercises ?? []).map(item => ({
      key: newKey('exercise'), id: numberOf(item.id) || undefined, exerciseId: numberOf(item.exerciseId), exercise: lite(item.exercise),
      notes: item.notes ?? '', supersetGroupId: numberOf(item.supersetGroupId) || null,
      sets: (item.exerciseSets ?? []).map(set => ({
        key: newKey('set'), id: numberOf(set.id) || undefined, weight: numberOf(set.weight), repetitions: numberOf(set.repetitions),
        setType: typeof set.setType === 'number' ? set.setType : numberOf(set.setType ?? 1), rpe: set.rpe == null ? null : numberOf(set.rpe),
      })),
    })),
  }
}

/** A new exercise from the library, with one set to fill (type chosen on the page). */
export function formExercise(exercise: Exercise | ExerciseLite, setType = 1): FormExercise {
  return { key: newKey('exercise'), exerciseId: numberOf(exercise.id), exercise: lite(exercise), notes: '', supersetGroupId: null, sets: [newSet(setType)] }
}

/** A new set copies the previous one (weight, reps) like the live screen; its type is the page’s type. */
export function newSet(setType = 1, previous?: FormSet): FormSet {
  return { key: newKey('set'), weight: previous?.weight ?? 0, repetitions: previous?.repetitions ?? 10, setType, rpe: null }
}

export const moveExercise = (form: WorkoutForm, from: number, to: number): WorkoutForm => ({ ...form, items: moveItem(form.items, from, to) })

/* ── Supersets ───────────────────────────────────────────────────────────── */

/** Links an exercise to the one above it (joins its superset, or starts a new one with it). */
export function linkWithPrevious(form: WorkoutForm, index: number): WorkoutForm {
  const previous = form.items[index - 1]
  if (!previous) return form
  const group = previous.supersetGroupId ?? Math.max(0, ...form.items.map(item => item.supersetGroupId ?? 0)) + 1
  return { ...form, items: form.items.map((item, position) => position === index || position === index - 1 ? { ...item, supersetGroupId: group } : item) }
}

/** Takes an exercise out of its superset; a superset left with a single exercise is dissolved. */
export function unlinkSuperset(form: WorkoutForm, index: number): WorkoutForm {
  const group = form.items[index]?.supersetGroupId
  if (!group) return form
  const items = form.items.map((item, position) => position === index ? { ...item, supersetGroupId: null } : item)
  const left = items.filter(item => item.supersetGroupId === group)
  return { ...form, items: left.length === 1 ? items.map(item => item.supersetGroupId === group ? { ...item, supersetGroupId: null } : item) : items }
}

/** Removes an exercise; a superset left with a single exercise is dissolved. */
export function withoutExercise(form: WorkoutForm, key: string): WorkoutForm {
  const items = form.items.filter(item => item.key !== key)
  const counts = new Map<number, number>()
  items.forEach(item => { if (item.supersetGroupId) counts.set(item.supersetGroupId, (counts.get(item.supersetGroupId) ?? 0) + 1) })
  return { ...form, items: items.map(item => item.supersetGroupId && counts.get(item.supersetGroupId) === 1 ? { ...item, supersetGroupId: null } : item) }
}

/** « A », « B »… as V5 shows it (group id 1 = A). */
export const supersetLetter = (group: number | null) => group ? String.fromCharCode(64 + group) : ''

/* ── Validation and payload ──────────────────────────────────────────────── */

export type FormErrors = Partial<Record<'name' | 'date' | 'duration' | 'items', string>>

export function validateForm(form: WorkoutForm): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Indique le nom de la séance.'
  if (!form.date) errors.date = 'Indique la date.'
  if (form.minutes < 1) errors.duration = 'La durée doit être d’au moins une minute.'
  if (form.items.some(item => !item.sets.length)) errors.items = 'Chaque exercice doit avoir au moins une série.'
  else if (form.items.some(item => item.sets.some(set => set.repetitions < 1 || set.weight < 0))) errors.items = 'Chaque série doit avoir au moins une répétition.'
  return errors
}

const timeSpan = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`

/** True when the exercises are not in the order the server has them (saved ones only). */
export function orderChanged(form: WorkoutForm, initial?: Workout): boolean {
  if (!initial) return false
  const saved = (initial.workoutExercises ?? []).map(item => numberOf(item.id))
  const kept = form.items.map(item => item.id).filter((id): id is number => id != null)
  const expected = saved.filter(id => kept.includes(id))
  return kept.some((id, index) => id !== expected[index]) || form.items.some((item, index) => item.id == null && form.items.slice(index + 1).some(next => next.id != null))
}

/**
 * Body of POST (new) or PUT (edit). The whole session is sent: what the form left out is deleted by the server.
 * A reorder sends every exercise as a new row so the server keeps the order.
 */
export function workoutPayload(form: WorkoutForm, initial?: Workout): Workout {
  const fresh = !initial || orderChanged(form, initial)
  const time = initial?.date && initial.date.slice(0, 10) === form.date ? initial.date.slice(10) : 'T00:00:00'
  return {
    ...(initial ? { id: initial.id, workoutProgramSessionId: initial.workoutProgramSessionId, clientDraftId: initial.clientDraftId } : {}),
    name: form.name.trim(), date: `${form.date}${time || 'T00:00:00'}`, duration: timeSpan(form.minutes),
    workoutExercises: form.items.map(item => ({
      ...(!fresh && item.id ? { id: item.id, workoutSessionId: initial?.id } : {}),
      exerciseId: item.exerciseId, notes: item.notes.trim() || null, supersetGroupId: item.supersetGroupId,
      exerciseSets: item.sets.map(set => ({
        ...(!fresh && item.id && set.id ? { id: set.id, workoutExerciseId: item.id } : {}),
        weight: set.weight, repetitions: set.repetitions, setType: set.setType, rpe: set.rpe,
      })),
    })),
  }
}

export const setCount = (form: WorkoutForm) => form.items.reduce((sum, item) => sum + item.sets.length, 0)

export function isWorkoutForm(value: unknown): value is WorkoutForm {
  const form = value as WorkoutForm | null
  return !!form && typeof form.name === 'string' && typeof form.date === 'string' && typeof form.minutes === 'number' && Array.isArray(form.items)
    && form.items.every(item => typeof item?.key === 'string' && typeof item.exerciseId === 'number' && Array.isArray(item.sets))
}
