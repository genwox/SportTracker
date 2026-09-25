const TOKEN_KEY = 'st-auth-token'
const OWNER_KEY = 'st-draft-owner'
const CHANGE_EVENT = 'sporttracker:auth-changed'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getDraftOwner(): string | null {
  return localStorage.getItem(OWNER_KEY)
}

export function setDraftOwner(email: string): void {
  localStorage.setItem(OWNER_KEY, email.trim().toLowerCase())
}

export function setToken(token: string, email?: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  if (email?.trim()) setDraftOwner(email)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
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
