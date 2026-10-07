import { http } from '@/shared/api/http-client'
import type {
  CreateRoleRequest,
  Permission,
  Role,
  RoleFilters,
  UpdateRoleRequest,
} from '../types/role.types'

export const rolesApi = {
  list: (filters: RoleFilters = {}, signal?: AbortSignal) =>
    http<Role[]>('/roles', { query: { ...filters }, signal }),

  permissions: () => http<Permission[]>('/roles/permissions'),

  get: (id: string) => http<Role>(`/roles/${id}`),

  create: (body: CreateRoleRequest) => http<Role>('/roles', { method: 'POST', body }),

  update: (id: string, body: UpdateRoleRequest) =>
    http<Role>(`/roles/${id}`, { method: 'PATCH', body }),

  remove: (id: string) => http<void>(`/roles/${id}`, { method: 'DELETE' }),
}
