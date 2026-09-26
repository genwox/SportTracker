import type { components } from '../../api/schema'

export type Program = components['schemas']['WorkoutProgram']
export type ProgramSession = components['schemas']['WorkoutProgramSession']
export type PlannedExercise = components['schemas']['WorkoutProgramExercise']
export type Workout = components['schemas']['WorkoutSession']

/*
 * V5 data of the Carnets, derived from what the API already stores (no new model):
 * - a programme session is « Fait » this week when a workout linked to it (WorkoutProgramSessionId) is dated this week;
 * - the « Actif » programme owns the most recent linked workout;
 * - supersets and set-type badges come from the latest workout logged for the session.
 */

export const num = (value: number | string | null | undefined) => Number(value ?? 0) || 0
const time = (value?: string) => value ? new Date(value).getTime() : 0

/** Monday 00:00 (local) of the week containing `now`. */
export function weekStart(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

export const sortedSessions = (program?: Program | null) => [...(program?.sessions ?? [])].sort((a, b) => num(a.order) - num(b.order))
export const sortedExercises = (session?: ProgramSession | null) => [...(session?.exercises ?? [])].sort((a, b) => num(a.order) - num(b.order))

export function sessionTotals(session?: ProgramSession | null) {
  const exercises = session?.exercises ?? []
  return { exercises: exercises.length, sets: exercises.reduce((total, exercise) => total + num(exercise.targetSets), 0) }
}

export function programTotals(program?: Program | null) {
  const sessions = program?.sessions ?? []
  return sessions.reduce((totals, session) => {
    const { exercises, sets } = sessionTotals(session)
    return { sessions: totals.sessions, exercises: totals.exercises + exercises, sets: totals.sets + sets }
  }, { sessions: sessions.length, exercises: 0, sets: 0 })
}

/** Latest workout logged from this programme session, if any. */
export function lastWorkoutFor(sessionId: number, workouts: Workout[]): Workout | undefined {
  return workouts.filter(workout => num(workout.workoutProgramSessionId) === sessionId && sessionId > 0)
    .sort((a, b) => time(b.date) - time(a.date))[0]
}

/** Programme sessions with a linked workout dated this week. */
export function doneThisWeek(workouts: Workout[], now = new Date()): Set<number> {
  const start = weekStart(now).getTime()
  const end = start + 7 * 86_400_000
  return new Set(workouts.filter(workout => { const at = time(workout.date); return at >= start && at < end })
    .map(workout => num(workout.workoutProgramSessionId)).filter(Boolean))
}

export type SessionStatus = 'done' | 'todo'
export const sessionStatus = (session: ProgramSession, done: Set<number>): SessionStatus => done.has(num(session.id)) ? 'done' : 'todo'

/** « 3 / 4 séances » this week and the share of the week done (V5 « 75 % de la semaine terminée »). */
export function programWeek(program: Program | undefined | null, done: Set<number>) {
  const sessions = program?.sessions ?? []
  const count = sessions.filter(session => done.has(num(session.id))).length
  return { done: count, total: sessions.length, percent: sessions.length ? Math.round(count / sessions.length * 100) : 0 }
}

/** First session (in order) not done this week; the first one when the whole week is done. */
export function nextSession(program: Program | undefined | null, done: Set<number>): ProgramSession | undefined {
  const sessions = sortedSessions(program)
  return sessions.find(session => !done.has(num(session.id))) ?? sessions[0]
}

/** Programme owning the most recent linked workout (V5 « Actif » badge). */
export function activeProgramId(programs: Program[], workouts: Workout[]): number | null {
  const owner = new Map<number, number>()
  for (const program of programs) for (const session of program.sessions ?? []) owner.set(num(session.id), num(program.id))
  const latest = workouts.filter(workout => owner.has(num(workout.workoutProgramSessionId))).sort((a, b) => time(b.date) - time(a.date))[0]
  return latest ? owner.get(num(latest.workoutProgramSessionId)) ?? null : null
}

export const supersetLetter = (group: number) => String.fromCharCode(64 + group)

/** exerciseId → superset letter, from the latest workout of the session (supersets are set during the live workout). */
export function supersetsOf(workout?: Workout): Map<number, string> {
  const groups = new Map<number, string>()
  for (const exercise of workout?.workoutExercises ?? []) {
    const group = num(exercise.supersetGroupId)
    if (group > 0) groups.set(num(exercise.exerciseId), supersetLetter(group))
  }
  return groups
}

/** Distinct superset letters of a session, in order (« superset A »). */
export const supersetNames = (workout?: Workout) => [...new Set(supersetsOf(workout).values())].sort()

const setTypes = [
  { key: 'Warmup', label: 'Éch.', tone: 'warmup' },
  { key: 'Normal', label: 'Normal', tone: 'surface' },
  { key: 'DropSet', label: 'Drop', tone: 'dropset' },
  { key: 'Failure', label: 'Échec', tone: 'failure' },
] as const

/** V5 set-type badge; the API serialises the enum as a number (or its name). */
export function setTypeBadge(value: number | string | null | undefined) {
  if (typeof value === 'string' && Number.isNaN(Number(value))) return setTypes.find(type => type.key === value) ?? setTypes[1]
  return setTypes[num(value ?? 1)] ?? setTypes[1]
}

export type LastSet = { type: ReturnType<typeof setTypeBadge>; weight: number; repetitions: number }

/** Sets of an exercise in the latest workout of the session (« Dernière fois »). */
export function lastSetsOf(workout: Workout | undefined, exerciseId: number): LastSet[] {
  const logged = workout?.workoutExercises?.find(exercise => num(exercise.exerciseId) === exerciseId)
  return (logged?.exerciseSets ?? []).map(set => ({ type: setTypeBadge(set.setType), weight: num(set.weight), repetitions: num(set.repetitions) }))
}

/** Moves one item of a list (reorder handle), without mutating it. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return next
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved)
  return next
}

/** Rest shown in lists (« 90 s ») and on the wheel (« 1 min 30 s »). */
export function formatRestLong(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (!minutes) return `${rest} s`
  return rest ? `${minutes} min ${String(rest).padStart(2, '0')} s` : `${minutes} min`
}

/** Programme with one session replaced (or appended when new); its exercises get their new order. Nested objects are kept for display. */
export function withSession(program: Program, session: ProgramSession): Program {
  const sessions = [...(program.sessions ?? [])]
  const next: ProgramSession = { ...session, exercises: (session.exercises ?? []).map((exercise, order) => ({ ...exercise, order })) }
  const index = num(session.id) ? sessions.findIndex(item => num(item.id) === num(session.id)) : -1
  if (index >= 0) sessions[index] = next; else sessions.push({ ...next, order: sessions.length, workoutProgramId: program.id })
  return { ...program, sessions }
}

/** Body of PUT api/programs/{id}: ids and targets only, without the nested exercise and back references. */
export function programPayload(program: Program): Program {
  return {
    ...program,
    sessions: (program.sessions ?? []).map(session => ({
      ...session, workoutProgram: null,
      exercises: (session.exercises ?? []).map(exercise => ({ ...exercise, exercise: null, workoutProgramSession: null })),
    })),
  }
}

/** Copy of a programme for « Dupliquer » (POST): no ids, same sessions and exercises. */
export function duplicateProgram(program: Program): Program {
  return {
    name: `${program.name ?? 'Carnet'} (copie)`, objective: program.objective, colorHex: program.colorHex,
    sessions: sortedSessions(program).map((session, order) => ({
      name: session.name, order,
      exercises: sortedExercises(session).map((exercise, index) => ({
        exerciseId: exercise.exerciseId, order: index, targetSets: exercise.targetSets, targetRepsMin: exercise.targetRepsMin,
        targetRepsMax: exercise.targetRepsMax, restSeconds: exercise.restSeconds,
      })),
    })),
  }
}
