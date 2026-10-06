import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET_TIMEOUT_MS, apiRequest } from './client'

// fetch that never answers and rejects when its signal aborts, like a real hung request.
const hungFetch = () => vi.fn((_url: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
}))

describe('apiRequest timeout', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('aborts a read that gets no answer', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hungFetch())
    const result = apiRequest('api/workoutsessions', { auth: false })
    const assertion = expect(result).rejects.toThrow('Aborted')
    await vi.advanceTimersByTimeAsync(GET_TIMEOUT_MS)
    await assertion
  })

  it('never aborts a write on its own (the server may already have applied it)', async () => {
    vi.useFakeTimers()
    const fetchMock = hungFetch()
    vi.stubGlobal('fetch', fetchMock)
    const settled = vi.fn()
    void apiRequest('api/workoutsessions', { method: 'POST', body: { name: 'x' }, auth: false }).then(settled, settled)
    await vi.advanceTimersByTimeAsync(GET_TIMEOUT_MS * 2)
    expect(settled).not.toHaveBeenCalled()
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeFalsy()
  })
})
