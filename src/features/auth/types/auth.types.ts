export interface AuthTokens {
  tokenType: 'Bearer'
  accessToken: string
  /** Segundos de validez del access token. */
  expiresIn: number
  refreshToken: string
  refreshTokenExpiresAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse extends AuthTokens {
  mustChangePassword: boolean
  user: {
    id: string
    username: string
    fullName: string
    permissions: string[]
  }
}

/** Subconjunto de GET /auth/me que usa la sesión. */
export interface MeResponse {
  id: string
  username: string
  fullName: string
  mustChangePassword: boolean
  effectivePermissions: string[]
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/** Usuario de la sesión actual. */
export interface SessionUser {
  id: string
  username: string
  fullName: string
  permissions: string[]
  mustChangePassword: boolean
}
