import { describe, expect, it } from 'vitest'
import { createStepDetector, detectStep } from './stepCounter'

describe('foreground step estimate', () => {
  it('ignores a stationary device and invalid samples', () => {
    let state = createStepDetector()
    for (let now = 0; now < 5000; now += 20) {
      const result = detectStep(state, 9.81 + Math.sin(now) * 0.05, now)
      expect(result.step).toBe(false); state = result.state
    }
    expect(detectStep(state, NaN, 6000).step).toBe(false)
  })
  it('counts distinct walking pulses without counting their plateau twice', () => {
    let state = detectStep(createStepDetector(), 9.81, 0).state, steps = 0
    for (let now = 20; now <= 5000; now += 20) {
      const magnitude = now % 500 >= 100 && now % 500 <= 160 ? 12.5 : 9.3
      const result = detectStep(state, magnitude, now)
      state = result.state; if (result.step) steps++
    }
    expect(steps).toBe(10)
  })
  it('reinitializes after suspension rather than interpreting a new position as a step', () => {
    const before = detectStep(createStepDetector(), 9.81, 0).state
    expect(detectStep(before, 13, 5000).step).toBe(false)
  })
})
