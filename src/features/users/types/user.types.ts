import type { AuditFields, EntityRef, PaginationParams } from '@/shared/types/api.types'

export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type InactiveReason = 'RESIGNATION' | 'DISMISSAL' | 'MEDICAL_LEAVE' | 'SUSPENSION' | 'OTHER'

export const INACTIVE_REASON_LABELS: Record<InactiveReason, string> = {
  RESIGNATION: 'Renuncia',
  DISMISSAL: 'Despido',
  MEDICAL_LEAVE: 'Baja médica',
  SUSPENSION: 'Suspensión',
  OTHER: 'Otro',
}

export interface UserRoleRef {
  id: string
  name: string
  isActive: boolean
  isSystem: boolean
}

export interface PermissionRef {
  id: string
  code: string
  module: string
  description: string
}

/** Versión resumida (listados y login). */
export interface UserSummary {
  id: string
  firstName: string
  paternalLastName: string
  maternalLastName: string | null
  fullName: string
  username: string
  email: string | null
  ciNumber: string | null
  position: string | null
  area: EntityRef | null
  status: UserStatus
  inactiveReason: InactiveReason | null
  lastLoginAt: string | null
  roles: UserRoleRef[]
}

/** Versión completa (detalle). */
export interface UserDetail extends UserSummary, AuditFields {
  birthDate: string | null
  phone: string | null
  inactiveDate: string | null
  inactiveNotes: string | null
  mustChangePassword: boolean
  passwordChangedAt: string | null
  lockedUntil: string | null
  permissionOverrides: { effect: 'GRANT' | 'DENY'; permission: PermissionRef }[]
  effectivePermissions: string[]
}

export interface UserFilters extends PaginationParams {
  search?: string
  status?: UserStatus
  areaId?: string
}

export interface CreateUserRequest {
  firstName: string
  paternalLastName: string
  maternalLastName?: string
  ciNumber: string
  username: string
  email: string
  password: string
  birthDate: string
  phone?: string
  position?: string
  areaId?: string
  roleIds?: string[]
}

export type UpdateUserRequest = Partial<
  Omit<CreateUserRequest, 'password' | 'roleIds' | 'maternalLastName' | 'phone' | 'position' | 'areaId'>
> & {
  maternalLastName?: string | null
  phone?: string | null
  position?: string | null
  areaId?: string | null
}

export interface ChangeUserStatusRequest {
  status: UserStatus
  reason?: InactiveReason
  date?: string
  notes?: string
}

export interface AssignPermissionsRequest {
  grantedPermissionIds: string[]
  deniedPermissionIds: string[]
}
