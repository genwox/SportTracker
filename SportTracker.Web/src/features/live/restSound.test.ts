import { describe, expect, it } from 'vitest'
import { createRestTimer, pauseRestTimer, refreshRestTimer, startRestTimer } from '../../domain/restTimer'
import { isRestDue, isRestSoundTimely } from './restSound'

describe('rest completion alert', () => {
  it('alerts at the deadline, not before or when paused/skipped', () => {
    const timer = startRestTimer(1000, 100)
    expect(isRestDue(timer, 1099)).toBe(false)
    expect(isRestSoundTimely(timer, 1100)).toBe(true)
    expect(isRestDue(pauseRestTimer(timer, 500), 2000)).toBe(false)
    expect(isRestDue(createRestTimer(), 2000)).toBe(false)
    expect(isRestDue(startRestTimer(0, 100), 100)).toBe(false)
  })
  it('does not repeat after persisted completion or sound after a long suspension', () => {
    const timer = startRestTimer(1000, 100)
    expect(isRestDue(refreshRestTimer(timer, 1100), 1200)).toBe(false)
    expect(isRestDue(timer, 60_000)).toBe(true)
    expect(isRestSoundTimely(timer, 60_000)).toBe(false)
  })
})
