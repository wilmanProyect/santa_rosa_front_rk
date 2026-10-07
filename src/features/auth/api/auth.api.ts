import { http } from '@/shared/api/http-client'
import type {
  AuthTokens,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  MeResponse,
} from '../types/auth.types'

export const authApi = {
  login: (body: LoginRequest) =>
    http<LoginResponse>('/auth/login', { method: 'POST', body, auth: false }),

  refresh: (refreshToken: string) =>
    http<AuthTokens>('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }),

  logout: () => http<void>('/auth/logout', { method: 'POST' }),

  me: () => http<MeResponse>('/auth/me'),

  changePassword: (body: ChangePasswordRequest) =>
    http<AuthTokens>('/auth/me/password', { method: 'PUT', body }),
}
