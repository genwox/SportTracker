import type { components } from './schema'
import { apiRequest, ApiError } from './client'
import { setDraftOwner, setToken } from './tokenStore'

type Credentials = components['schemas']['LoginRequest']
type RegisterRequest = components['schemas']['RegisterRequest']
type AccessTokenResponse = components['schemas']['AccessTokenResponse']
export type UserInfo = components['schemas']['InfoResponse']

function identityErrors(error: ApiError): string | null {
  const body = error.body as { errors?: Record<string, string[]> } | undefined
  const messages = Object.values(body?.errors ?? {}).flat()
  return messages.length ? messages.join(' ') : null
}

export async function login(email: string, password: string): Promise<string | null> {
  try {
    const response = await apiRequest<AccessTokenResponse>('/login', {
      method: 'POST', auth: false, body: { email, password } satisfies Credentials,
    })
    if (!response?.accessToken) return 'Réponse du serveur invalide.'
    setToken(response.accessToken, email)
    return null
  } catch (error) {
    if (error instanceof ApiError) return 'Email ou mot de passe incorrect.'
    return 'Impossible de joindre le serveur.'
  }
}

export async function register(email: string, password: string): Promise<string | null> {
  try {
    await apiRequest<void>('/register', {
      method: 'POST', auth: false, body: { email, password } satisfies RegisterRequest,
    })
  } catch (error) {
    if (error instanceof ApiError) return identityErrors(error) ?? "Inscription impossible. Vérifie l'email et le mot de passe."
    return 'Impossible de joindre le serveur.'
  }
  return login(email, password)
}

export async function getUserInfo(): Promise<UserInfo> {
  const info = await apiRequest<UserInfo>('/manage/info')
  setDraftOwner(info.email)
  return info
}
