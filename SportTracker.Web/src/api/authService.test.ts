import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getUserInfo, login, register } from './authService'
import { apiRequest } from './client'
import { getDraftOwner, getToken, isTokenRemembered, setTokenRemembered } from './tokenStore'

const items = new Map<string, string>()

beforeEach(() => {
  items.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  })
  vi.stubGlobal('window', {
    dispatchEvent: vi.fn(),
    location: { pathname: '/tabs/today', search: '', hash: '', assign: vi.fn() },
  })
  vi.stubGlobal('Event', class { type: string; constructor(type: string) { this.type = type } })
})

afterEach(() => vi.unstubAllGlobals())

describe('Identity client', () => {
  it('sends login without an old bearer and preserves the Blazor token and owner keys', async () => {
    items.set('st-auth-token', 'old-token')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: 'new-token' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await login(' Athlete@Example.COM ', 'secret')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: ' Athlete@Example.COM ', password: 'secret' })
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('Authorization')).toBe(false)
    expect(getToken()).toBe('new-token')
    expect(getDraftOwner()).toBe('athlete@example.com')
  })

  it('keeps the token for this session only when « Rester connecté » is off, and can move it back', async () => {
    const session = new Map<string, string>()
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value), removeItem: (key: string) => session.delete(key) })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: 'short-token' }), { status: 200, headers: { 'content-type': 'application/json' } })))

    expect(await login('a@b.fr', 'secret', false)).toBeNull()
    expect(items.has('st-auth-token')).toBe(false)
    expect(session.get('st-auth-token')).toBe('short-token')
    expect(getToken()).toBe('short-token')
    expect(isTokenRemembered()).toBe(false)
    setTokenRemembered(true)
    expect(items.get('st-auth-token')).toBe('short-token')
    expect(session.has('st-auth-token')).toBe(false)
    expect(isTokenRemembered()).toBe(true)
  })

  it('registers with an empty 200 response, then logs in', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'token' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await register('athlete@example.com', 'secret')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.map(call => new URL(call[0]).pathname)).toEqual(['/register', '/login'])
    expect(getToken()).toBe('token')
  })

  it('adds bearer to API calls and clears the session on 401', async () => {
    items.set('st-auth-token', 'expired')
    items.set('st-draft-owner', 'athlete@example.com')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/manage/info')).rejects.toMatchObject({ status: 401 })
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer expired')
    expect(getToken()).toBeNull()
    expect(getDraftOwner()).toBeNull()
    expect(window.location.assign).toHaveBeenCalledWith('/login?returnUrl=%2Ftabs%2Ftoday')
  })

  it('uses the server email from manage/info as draft owner', async () => {
    items.set('st-auth-token', 'token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ email: 'REAL@Example.COM', isEmailConfirmed: false }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })))

    expect((await getUserInfo()).email).toBe('REAL@Example.COM')
    expect(getDraftOwner()).toBe('real@example.com')
  })
})
