/** Foreground motion estimate, not the system's daily step count. */
export type StepDetector = { gravity: number | null; armed: boolean; lastStepAt: number; lastSampleAt: number }
export const createStepDetector = (): StepDetector => ({ gravity: null, armed: true, lastStepAt: -Infinity, lastSampleAt: -Infinity })

export function detectStep(state: StepDetector, magnitude: number, now: number): { state: StepDetector; step: boolean } {
  if (!Number.isFinite(magnitude) || magnitude < 0 || !Number.isFinite(now)) return { state, step: false }
  if (state.gravity === null || now - state.lastSampleAt > 1000 || now < state.lastSampleAt) {
    return { state: { ...createStepDetector(), gravity: magnitude, lastSampleAt: now }, step: false }
  }
  // Time-based low pass removes gravity without depending on a device's sample rate.
  const alpha = 1 - Math.exp(-Math.max(0, now - state.lastSampleAt) / 500)
  const gravity = state.gravity + alpha * (magnitude - state.gravity)
  const movement = magnitude - gravity
  const armed = movement < 0.3 ? true : state.armed
  const step = armed && movement > 1.2 && movement < 12 && now - state.lastStepAt >= 280
  return { state: { gravity, armed: step ? false : armed, lastStepAt: step ? now : state.lastStepAt, lastSampleAt: now }, step }
}
