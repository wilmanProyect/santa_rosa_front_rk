import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'
import type { UserFilters } from '../types/user.types'

export const usersKeys = {
  all: ['users'] as const,
  list: (filters: UserFilters) => [...usersKeys.all, 'list', filters] as const,
  detail: (id: string) => [...usersKeys.all, 'detail', id] as const,
}

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: usersKeys.list(filters),
    queryFn: ({ signal }) => usersApi.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: () => usersApi.get(id),
  })
}
