const TOKEN_KEY = 'st-auth-token'
const OWNER_KEY = 'st-draft-owner'
const CHANGE_EVENT = 'sporttracker:auth-changed'

/**
 * « Rester connecté 30 jours » off: the token lives in sessionStorage and is forgotten when the app is closed.
 * On (default, and the Blazor key kept for the switch-over): localStorage.
 */
function sessionStore(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try { return globalThis.sessionStorage ?? null } catch { return null }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStore()?.getItem(TOKEN_KEY) ?? null
}

/** True unless the current token was saved for this session only. */
export function isTokenRemembered(): boolean {
  return localStorage.getItem(TOKEN_KEY) != null || !sessionStore()?.getItem(TOKEN_KEY)
}

export function getDraftOwner(): string | null {
  return localStorage.getItem(OWNER_KEY)
}

export function setDraftOwner(email: string): void {
  localStorage.setItem(OWNER_KEY, email.trim().toLowerCase())
}

export function setToken(token: string, email?: string, remember = true): void {
  if (remember) { localStorage.setItem(TOKEN_KEY, token); sessionStore()?.removeItem(TOKEN_KEY) }
  else { sessionStore()?.setItem(TOKEN_KEY, token); localStorage.removeItem(TOKEN_KEY) }
  if (email?.trim()) setDraftOwner(email)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Moves the current token between the two stores (Profil › Rester connecté). */
export function setTokenRemembered(remember: boolean): void {
  const token = getToken()
  if (!token) return
  if (remember) { localStorage.setItem(TOKEN_KEY, token); sessionStore()?.removeItem(TOKEN_KEY) }
  else { sessionStore()?.setItem(TOKEN_KEY, token); localStorage.removeItem(TOKEN_KEY) }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  sessionStore()?.removeItem(TOKEN_KEY)
  localStorage.removeItem(OWNER_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeAuthChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
