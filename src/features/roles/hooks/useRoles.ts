import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { rolesApi } from '../api/roles.api'
import type { CreateRoleRequest, RoleFilters, UpdateRoleRequest } from '../types/role.types'

export const rolesKeys = {
  all: ['roles'] as const,
  list: (filters: RoleFilters) => [...rolesKeys.all, 'list', filters] as const,
  detail: (id: string) => [...rolesKeys.all, 'detail', id] as const,
  permissions: ['permissions'] as const,
}

export function useRoles(filters: RoleFilters = {}) {
  return useQuery({
    queryKey: rolesKeys.list(filters),
    queryFn: ({ signal }) => rolesApi.list(filters, signal),
  })
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: rolesKeys.detail(id ?? ''),
    queryFn: () => rolesApi.get(id!),
    enabled: !!id,
  })
}

/** El catálogo de permisos casi no cambia: se cachea por más tiempo. */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: rolesKeys.permissions,
    queryFn: () => rolesApi.permissions(),
    staleTime: 10 * 60_000,
  })
}

/**
 * Los cambios en roles rigen de inmediato en el backend: se refrescan los roles,
 * los usuarios (muestran sus roles) y los permisos de la sesión actual.
 */
function useInvalidateRoles() {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: rolesKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      refreshUser(),
    ])
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: (body: CreateRoleRequest) => rolesApi.create(body),
    onSuccess: invalidate,
  })
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoles()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleRequest }) => rolesApi.update(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: rolesKeys.detail(id) })
      return invalidate()
    },
  })
}
