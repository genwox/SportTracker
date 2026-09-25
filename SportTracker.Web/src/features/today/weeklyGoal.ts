import { apiRequest } from '../../api/client'
import { getToken } from '../../api/tokenStore'

export const DEFAULT_WEEKLY_GOAL = 4
const PREFIX = 'st-weekly-goal:v1:'
let cachedToken: string | null = null
let cachedEmail: string | null = null
let pendingToken: string | null = null
let pending: Promise<string | null> | null = null

export function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  return normalized || null
}

export async function getGoalEmail(): Promise<string | null> {
  let token: string | null
  try { token = getToken() } catch { return null }
  if (!token) return null
  if (token === cachedToken && cachedEmail) return cachedEmail
  if (!pending || pendingToken !== token) {
    pendingToken = token
    pending = apiRequest<{ email?: string }>('manage/info')
      .then(info => normalizeEmail(info.email)).catch(() => null)
  }
  const request = pending
  const email = await request
  if (pending === request) {
    pending = null
    pendingToken = null
    if (email) { cachedToken = token; cachedEmail = email }
  }
  return email
}

export async function isGoalAvailable(): Promise<boolean> {
  return (await getGoalEmail()) !== null
}

export async function getWeeklyGoal(): Promise<number> {
  const email = await getGoalEmail()
  if (!email) return DEFAULT_WEEKLY_GOAL
  try {
    const raw = localStorage.getItem(PREFIX + email)
    if (raw && /^\d+$/.test(raw)) {
      const value = Number(raw)
      if (Number.isSafeInteger(value) && value > 0) return value
    }
  } catch { /* Storage may be unavailable. */ }
  return DEFAULT_WEEKLY_GOAL
}

export async function setWeeklyGoal(value: number): Promise<boolean> {
  if (!Number.isSafeInteger(value) || value <= 0) return false
  const email = await getGoalEmail()
  if (!email) return false
  try { localStorage.setItem(PREFIX + email, String(value)); return true }
  catch { return false }
}

export function resetGoalIdentityCache(): void {
  cachedToken = cachedEmail = pendingToken = null
  pending = null
}
