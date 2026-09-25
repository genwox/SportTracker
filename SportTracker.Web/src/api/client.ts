import { clearToken, getToken } from './tokenStore'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5294'

let onUnauthorized: (() => void) | undefined

export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  onUnauthorized = handler
}

export class ApiError extends Error {
  readonly status: number
  readonly body?: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  auth?: boolean
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, auth = true, headers: suppliedHeaders, ...init } = options
  const token = auth ? getToken() : null
  const headers = new Headers(suppliedHeaders)
  if (body !== undefined && !(body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(new URL(path.replace(/^\//, ''), `${API_BASE_URL.replace(/\/$/, '')}/`), {
    ...init,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  })

  if (response.status === 401 && token && token === getToken()) {
    clearToken()
    onUnauthorized?.()
    if (window.location.pathname !== '/login') {
      const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.assign(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
    }
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    const detail = contentType.includes('json') ? await response.json().catch(() => undefined) : await response.text().catch(() => undefined)
    throw new ApiError(response.status, `HTTP ${response.status}`, detail)
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('json')) return undefined as T
  return response.json() as Promise<T>
}
