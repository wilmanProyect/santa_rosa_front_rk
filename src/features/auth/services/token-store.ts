import { configureHttpAuth } from '@/shared/api/http-client'
import { storage } from '@/shared/lib/storage'
import { authApi } from '../api/auth.api'
import type { AuthTokens } from '../types/auth.types'

const ACCESS_KEY = 'sr.accessToken'
const REFRESH_KEY = 'sr.refreshToken'

type Listener = () => void
const expiredListeners = new Set<Listener>()

/** Guarda los tokens de la sesión y conecta el cliente HTTP con ellos. */
export const tokenStore = {
  getAccessToken: () => storage.get(ACCESS_KEY),
  getRefreshToken: () => storage.get(REFRESH_KEY),
  hasSession: () => storage.get(REFRESH_KEY) !== null,

  save(tokens: AuthTokens) {
    storage.set(ACCESS_KEY, tokens.accessToken)
    storage.set(REFRESH_KEY, tokens.refreshToken)
  },

  clear() {
    storage.remove(ACCESS_KEY)
    storage.remove(REFRESH_KEY)
  },

  /** Se ejecuta cuando la sesión expira y no se puede renovar. */
  onExpired(listener: Listener): () => void {
    expiredListeners.add(listener)
    return () => {
      expiredListeners.delete(listener)
    }
  },
}

configureHttpAuth({
  getAccessToken: tokenStore.getAccessToken,

  async refreshAccessToken() {
    const refreshToken = tokenStore.getRefreshToken()
    if (!refreshToken) return null
    const tokens = await authApi.refresh(refreshToken)
    tokenStore.save(tokens)
    return tokens.accessToken
  },

  onSessionExpired() {
    tokenStore.clear()
    expiredListeners.forEach((listener) => listener())
  },
})
