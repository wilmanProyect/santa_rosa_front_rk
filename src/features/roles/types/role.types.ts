import type { AuditFields, EntityRef } from '@/shared/types/api.types'

export interface Permission {
  id: string
  code: string
  module: string
  description: string
}

export interface Role extends AuditFields {
  id: string
  name: string
  description: string | null
  area: EntityRef | null
  isActive: boolean
  /** Rol Administrador: no se puede editar ni eliminar. */
  isSystem: boolean
  permissions: Permission[]
}

export interface RoleFilters {
  areaId?: string
  isActive?: boolean
}

export interface CreateRoleRequest {
  name: string
  description?: string
  areaId?: string
  permissionIds?: string[]
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
  areaId?: string | null
  isActive?: boolean
  permissionIds?: string[]
}
