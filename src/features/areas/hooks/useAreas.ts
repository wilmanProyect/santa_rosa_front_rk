import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { areasApi } from '../api/areas.api'
import type { AreaFilters, CreateAreaRequest, UpdateAreaRequest } from '../types/area.types'

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

/**
 * Un cambio en un área se ve también en roles y usuarios (muestran su nombre),
 * así que se invalidan esas listas además de las de áreas.
 */
function useInvalidateAreas() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: areasKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['roles'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
    ])
}

export function useCreateArea() {
  const invalidate = useInvalidateAreas()
  return useMutation({
    mutationFn: (body: CreateAreaRequest) => areasApi.create(body),
    onSuccess: invalidate,
  })
}

export function useUpdateArea() {
  const invalidate = useInvalidateAreas()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAreaRequest }) => areasApi.update(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteArea() {
  const invalidate = useInvalidateAreas()
  return useMutation({
    mutationFn: (id: string) => areasApi.remove(id),
    onSuccess: invalidate,
  })
}
