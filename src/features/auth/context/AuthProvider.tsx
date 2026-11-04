import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'
import { tokenStore } from '../services/token-store'
import type { MeResponse, SessionUser } from '../types/auth.types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

const toSessionUser = (me: MeResponse): SessionUser => ({
  id: me.id,
  username: me.username,
  fullName: me.fullName,
  permissions: me.effectivePermissions,
  mustChangePassword: me.mustChangePassword,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.hasSession() ? 'loading' : 'anonymous',
  )

  const endSession = useCallback(() => {
    tokenStore.clear()
    queryClient.clear()
    setUser(null)
    setStatus('anonymous')
  }, [queryClient])

  // Restaura la sesión guardada al abrir la app.
  useEffect(() => {
    if (!tokenStore.hasSession()) return
    let cancelled = false
    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        setUser(toSessionUser(me))
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) endSession()
      })
    return () => {
      cancelled = true
    }
  }, [endSession])

  // Si el refresh falla en cualquier petición, se cierra la sesión.
  useEffect(() => tokenStore.onExpired(endSession), [endSession])

  // Un 403 puede deberse a un cambio de contraseña pendiente (p. ej. un administrador la
  // restableció mientras el usuario estaba conectado). Se relee /auth/me para saberlo;
  // RequireAuth redirige a la pantalla de cambio si corresponde.
  useEffect(() => {
    let checking = false
    return tokenStore.onForbidden(() => {
      if (checking) return
      checking = true
      authApi
        .me()
        .then((me) => {
          if (me.mustChangePassword) setUser(toSessionUser(me))
        })
        .catch(() => {
          // Si la sesión terminó, el cliente HTTP ya la cerró.
        })
        .finally(() => {
          checking = false
        })
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,

      async login(credentials) {
        const response = await authApi.login(credentials)
        tokenStore.save(response)
        const sessionUser: SessionUser = {
          id: response.user.id,
          username: response.user.username,
          fullName: response.user.fullName,
          permissions: response.user.permissions,
          mustChangePassword: response.mustChangePassword,
        }
        setUser(sessionUser)
        setStatus('authenticated')
        return sessionUser
      },

      async logout() {
        try {
          await authApi.logout()
        } finally {
          endSession()
        }
      },

      async logoutAll() {
        try {
          await authApi.logoutAll()
        } finally {
          endSession()
        }
      },

      async changePassword(request) {
        const tokens = await authApi.changePassword(request)
        tokenStore.save(tokens)
        setUser(toSessionUser(await authApi.me()))
      },

      async refreshUser() {
        if (status !== 'authenticated') return
        try {
          setUser(toSessionUser(await authApi.me()))
        } catch {
          // Si la sesión ya no es válida, el cliente HTTP la cierra por su cuenta.
        }
      },

      can(...permissions) {
        return !!user && permissions.every((p) => user.permissions.includes(p))
      },
    }),
    [status, user, endSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
