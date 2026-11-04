import type { PaginationParams } from '@/shared/types/api.types'

export type LoginFailureReason = 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'USER_INACTIVE'

export const LOGIN_FAILURE_LABELS: Record<LoginFailureReason, string> = {
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos',
  ACCOUNT_LOCKED: 'Cuenta bloqueada',
  USER_INACTIVE: 'Usuario dado de baja',
}

/** Un intento de inicio de sesión (GET /auth/login-history). */
export interface LoginAttempt {
  id: string
  /** null si el usuario escrito no existe. */
  userId: string | null
  username: string
  success: boolean
  failureReason: LoginFailureReason | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export interface LoginHistoryFilters extends PaginationParams {
  userId?: string
  success?: boolean
}
