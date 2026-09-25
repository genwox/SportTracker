import { beforeEach, describe, expect, it, vi } from 'vitest'

let token: string | null = null
let email = 'alice@example.com'
let offline = false
let calls = 0
const storage = new Map<string, string>()
let storageFails = false

vi.mock('../../api/tokenStore', () => ({ getToken: () => token }))
vi.mock('../../api/client', () => ({ apiRequest: async () => {
  calls++
  if (offline) throw new Error('offline')
  return { email }
} }))

import { DEFAULT_WEEKLY_GOAL, getGoalEmail, getWeeklyGoal, isGoalAvailable, resetGoalIdentityCache, setWeeklyGoal } from './weeklyGoal'

beforeEach(() => {
  token = null; email = 'alice@example.com'; offline = false; calls = 0; storageFails = false
  storage.clear(); resetGoalIdentityCache()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => { if (storageFails) throw new Error('SecurityError'); return storage.get(key) ?? null },
    setItem: (key: string, value: string) => { if (storageFails) throw new Error('SecurityError'); storage.set(key, value) },
  })
})

describe('weekly goal', () => {
  it('defaults and refuses writes without a token', async () => {
    expect(await getWeeklyGoal()).toBe(DEFAULT_WEEKLY_GOAL)
    expect(await setWeeklyGoal(6)).toBe(false)
    expect(calls).toBe(0)
  })
  it('uses the normalized email as a versioned storage key', async () => {
    token = 'a'; email = ' Alice@Example.COM '
    expect(await getWeeklyGoal()).toBe(4)
    expect(await setWeeklyGoal(6)).toBe(true)
    expect(await getWeeklyGoal()).toBe(6)
    expect(storage.get('st-weekly-goal:v1:alice@example.com')).toBe('6')
    expect(calls).toBe(1)
  })
  it.each([0, -3])('rejects invalid goal %i', async value => {
    token = 'a'
    expect(await setWeeklyGoal(value)).toBe(false)
    expect(storage.size).toBe(0)
  })
  it.each(['abc', '0', '-2', '2.5'])('ignores invalid stored value %s', async raw => {
    token = 'a'; storage.set('st-weekly-goal:v1:alice@example.com', raw)
    expect(await getWeeklyGoal()).toBe(4)
  })
  it('treats a missing email and inaccessible storage as unavailable', async () => {
    token = 'a'; email = ''
    expect(await isGoalAvailable()).toBe(false)
    expect(await setWeeklyGoal(5)).toBe(false)
    email = 'alice@example.com'; storageFails = true
    expect(await getWeeklyGoal()).toBe(4)
    expect(await setWeeklyGoal(6)).toBe(false)
  })
  it('retries identity after a network failure', async () => {
    token = 'a'; offline = true; storage.set('st-weekly-goal:v1:alice@example.com', '6')
    expect(await isGoalAvailable()).toBe(false)
    expect(await getWeeklyGoal()).toBe(4)
    expect(await setWeeklyGoal(7)).toBe(false)
    offline = false
    expect(await isGoalAvailable()).toBe(true)
    expect(await getWeeklyGoal()).toBe(6)
  })
  it('shares an identity request and switches accounts with the token', async () => {
    token = 'a'
    expect(await Promise.all([getGoalEmail(), getGoalEmail(), getGoalEmail()])).toEqual(Array(3).fill('alice@example.com'))
    expect(calls).toBe(1)
    expect(await setWeeklyGoal(6)).toBe(true)
    token = null
    expect(await getWeeklyGoal()).toBe(4)
    token = 'b'; email = 'bob@example.com'
    expect(await getWeeklyGoal()).toBe(4)
    expect(await setWeeklyGoal(2)).toBe(true)
    expect(storage.get('st-weekly-goal:v1:alice@example.com')).toBe('6')
    expect(storage.get('st-weekly-goal:v1:bob@example.com')).toBe('2')
  })
})
