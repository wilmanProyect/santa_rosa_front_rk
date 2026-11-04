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

/** GET /auth/me completo, para la pantalla "Mi perfil". */
export interface ProfileResponse extends MeResponse {
  firstName: string
  paternalLastName: string
  maternalLastName: string | null
  email: string | null
  ciNumber: string | null
  phone: string | null
  birthDate: string | null
  position: string | null
  area: { id: string; name: string } | null
  roles: { id: string; name: string; isActive: boolean; isSystem: boolean }[]
  lastLoginAt: string | null
  passwordChangedAt: string | null
  createdAt: string
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
