import { useQuery } from '@tanstack/react-query'
import { areasApi } from '../api/areas.api'
import type { AreaFilters } from '../types/area.types'

export const areasKeys = {
  all: ['areas'] as const,
  list: (filters: AreaFilters) => [...areasKeys.all, 'list', filters] as const,
}

export function useAreas(filters: AreaFilters = {}) {
  return useQuery({
    queryKey: areasKeys.list(filters),
    queryFn: ({ signal }) => areasApi.list(filters, signal),
  })
}
