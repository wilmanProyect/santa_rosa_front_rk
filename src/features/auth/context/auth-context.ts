import { createContext } from 'react'
import type { PermissionCode } from '@/shared/config/permissions'
import type { ChangePasswordRequest, LoginRequest, SessionUser } from '../types/auth.types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  login(credentials: LoginRequest): Promise<SessionUser>
  logout(): Promise<void>
  changePassword(request: ChangePasswordRequest): Promise<void>
  /** true si el usuario tiene TODOS los permisos indicados. */
  can(...permissions: PermissionCode[]): boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
