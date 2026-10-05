import { describe, expect, it } from 'vitest'
import { localDate, parseHealthValue, weightPoints, weightSummary } from './healthData'

describe('body weight and daily steps', () => {
  it('accepts French decimals and rejects incomplete or invalid measures', () => {
    expect(parseHealthValue('weight', '75,55')).toBe(75.55)
    for (const raw of ['', 'abc', '0', '-75', '75,555', 'Infinity', '501']) expect(parseHealthValue('weight', raw)).toBeNull()
    expect(parseHealthValue('steps', '0')).toBe(0)
    expect(parseHealthValue('steps', '1234')).toBe(1234)
    expect(parseHealthValue('steps', '1,5')).toBeNull()
    expect(parseHealthValue('steps', '200001')).toBeNull()
  })
  it('orders weigh-ins and reports loss, gain, and lack of a baseline', () => {
    const entries = [{ date: '2026-10-05', weightKg: 74.8, steps: null }, { date: '2026-10-01', weightKg: 75.5, steps: 1000 }, { date: '2026-10-03', weightKg: null, steps: 4000 }]
    expect(weightSummary(entries).change).toBe(-0.7)
    expect(weightSummary(entries).latest).toBe(74.8)
    expect(weightSummary(entries.slice(0, 1)).change).toBeNull()
    expect(weightSummary([]).latest).toBeNull()
    expect(weightSummary([{ ...entries[0], weightKg: 80 }, entries[1]]).change).toBe(4.5)
  })
  it('uses calendar date locally and spaces chart points by time', () => {
    expect(localDate(new Date(2026, 9, 5, 0, 30))).toBe('2026-10-05')
    const entries = [{ date: '2026-10-01', weightKg: 75, steps: null }, { date: '2026-10-02', weightKg: 75, steps: null }, { date: '2026-10-05', weightKg: 75, steps: null }]
    expect(weightPoints(entries)).toBe('15,65 82.5,65 285,65')
    expect(weightPoints(entries.slice(0, 1))).toBe('150,65')
  })
})
