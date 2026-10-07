import { http } from '@/shared/api/http-client'
import type { Paginated } from '@/shared/types/api.types'
import type {
  AssignPermissionsRequest,
  ChangeUserStatusRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserDetail,
  UserFilters,
  UserSummary,
} from '../types/user.types'

export const usersApi = {
  list: (filters: UserFilters, signal?: AbortSignal) =>
    http<Paginated<UserSummary>>('/users', { query: { ...filters }, signal }),

  get: (id: string) => http<UserDetail>(`/users/${id}`),

  create: (body: CreateUserRequest) => http<UserDetail>('/users', { method: 'POST', body }),

  update: (id: string, body: UpdateUserRequest) =>
    http<UserDetail>(`/users/${id}`, { method: 'PATCH', body }),

  changeStatus: (id: string, body: ChangeUserStatusRequest) =>
    http<UserDetail>(`/users/${id}/status`, { method: 'PATCH', body }),

  assignRoles: (id: string, roleIds: string[]) =>
    http<UserDetail>(`/users/${id}/roles`, { method: 'PUT', body: { roleIds } }),

  assignPermissions: (id: string, body: AssignPermissionsRequest) =>
    http<UserDetail>(`/users/${id}/permissions`, { method: 'PUT', body }),

  resetPassword: (id: string, newPassword: string) =>
    http<void>(`/users/${id}/reset-password`, { method: 'POST', body: { newPassword } }),

  remove: (id: string) => http<void>(`/users/${id}`, { method: 'DELETE' }),
}
