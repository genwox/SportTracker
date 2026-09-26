export type RestTimer = { state: 'idle' | 'running' | 'paused' | 'finished'; durationMs: number; endsAt: number | null; remainingMs: number }
export const createRestTimer = (): RestTimer => ({ state: 'idle', durationMs: 0, endsAt: null, remainingMs: 0 })
export function startRestTimer(durationMs: number, now = Date.now()): RestTimer {
  const duration = Math.max(0, durationMs)
  return { state: duration ? 'running' : 'finished', durationMs: duration, endsAt: duration ? now + duration : null, remainingMs: duration }
}
export function remainingRestMs(timer: RestTimer, now = Date.now()): number {
  return timer.state === 'running' ? Math.max(0, (timer.endsAt ?? now) - now) : timer.remainingMs
}
export function refreshRestTimer(timer: RestTimer, now = Date.now()): RestTimer {
  if (timer.state !== 'running') return timer
  const remainingMs = remainingRestMs(timer, now)
  return remainingMs ? { ...timer, remainingMs } : { ...timer, state: 'finished', endsAt: null, remainingMs: 0 }
}
export function pauseRestTimer(timer: RestTimer, now = Date.now()): RestTimer {
  const current = refreshRestTimer(timer, now)
  return current.state === 'running' ? { ...current, state: 'paused', endsAt: null } : current
}
export function resumeRestTimer(timer: RestTimer, now = Date.now()): RestTimer {
  return timer.state === 'paused' ? { ...timer, state: 'running', endsAt: now + timer.remainingMs } : timer
}
export function restartRestTimer(timer: RestTimer, now = Date.now()): RestTimer { return startRestTimer(timer.durationMs, now) }
/** « +30 s » : lengthens the current rest (or starts one when none is running). */
export function addRestTime(timer: RestTimer, ms: number, now = Date.now()): RestTimer {
  const current = refreshRestTimer(timer, now)
  if (current.state === 'running') return { ...current, durationMs: current.durationMs + ms, endsAt: (current.endsAt ?? now) + ms, remainingMs: current.remainingMs + ms }
  if (current.state === 'paused') return { ...current, durationMs: current.durationMs + ms, remainingMs: current.remainingMs + ms }
  return startRestTimer(ms, now)
}
/** New planned rest while a rest is under way: the time already rested is kept, only the end moves. */
export function setRestDuration(timer: RestTimer, durationMs: number, now = Date.now()): RestTimer {
  const current = refreshRestTimer(timer, now)
  const duration = Math.max(0, durationMs)
  if (current.state === 'running') {
    const endsAt = (current.endsAt ?? now) - current.durationMs + duration
    return refreshRestTimer({ ...current, durationMs: duration, endsAt, remainingMs: Math.max(0, endsAt - now) }, now)
  }
  if (current.state === 'paused') {
    const remainingMs = Math.max(0, current.remainingMs + duration - current.durationMs)
    return remainingMs ? { ...current, durationMs: duration, remainingMs } : { state: 'finished', durationMs: duration, endsAt: null, remainingMs: 0 }
  }
  return current
}
/** Share of the rest still to go, from 1 (just started) to 0. */
export function restProgress(timer: RestTimer, now = Date.now()): number {
  return timer.durationMs ? Math.min(1, remainingRestMs(timer, now) / timer.durationMs) : 0
}
