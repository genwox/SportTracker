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
