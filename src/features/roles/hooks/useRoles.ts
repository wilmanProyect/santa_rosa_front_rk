import { useQuery } from '@tanstack/react-query'
import { rolesApi } from '../api/roles.api'
import type { RoleFilters } from '../types/role.types'

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

/** El catálogo de permisos casi no cambia: se cachea por más tiempo. */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: rolesKeys.permissions,
    queryFn: () => rolesApi.permissions(),
    staleTime: 10 * 60_000,
  })
}
