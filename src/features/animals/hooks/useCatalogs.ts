import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogsApi } from '../api/animals.api'
import type { BreedFilters, ColorFilters, Species } from '../types/animal.types'

export const catalogsKeys = {
  breeds: ['breeds'] as const,
  breedList: (filters: BreedFilters) => [...catalogsKeys.breeds, filters] as const,
  colors: ['animal-colors'] as const,
  colorList: (filters: ColorFilters) => [...catalogsKeys.colors, filters] as const,
}

const CATALOG_STALE_TIME = 5 * 60_000

export function useBreeds(filters: BreedFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: catalogsKeys.breedList(filters),
    queryFn: () => catalogsApi.breeds(filters),
    staleTime: CATALOG_STALE_TIME,
    enabled: options.enabled,
  })
}

export function useColors(filters: ColorFilters = {}) {
  return useQuery({
    queryKey: catalogsKeys.colorList(filters),
    queryFn: () => catalogsApi.colors(filters),
    staleTime: CATALOG_STALE_TIME,
  })
}

/** Un cambio de nombre en un catálogo se ve en los animales: también se refrescan. */
function useInvalidate(key: readonly string[]) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: ['animals'] }),
    ])
}

export function useSaveBreed() {
  const invalidate = useInvalidate(catalogsKeys.breeds)
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id?: string
      body: { species?: Species; name?: string; isActive?: boolean }
    }) =>
      id
        ? catalogsApi.updateBreed(id, body)
        : catalogsApi.createBreed(body as { species: Species; name: string }),
    onSuccess: invalidate,
  })
}

export function useDeleteBreed() {
  const invalidate = useInvalidate(catalogsKeys.breeds)
  return useMutation({ mutationFn: (id: string) => catalogsApi.removeBreed(id), onSuccess: invalidate })
}

export function useSaveColor() {
  const invalidate = useInvalidate(catalogsKeys.colors)
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: { name?: string; isActive?: boolean } }) =>
      id ? catalogsApi.updateColor(id, body) : catalogsApi.createColor(body as { name: string }),
    onSuccess: invalidate,
  })
}

export function useDeleteColor() {
  const invalidate = useInvalidate(catalogsKeys.colors)
  return useMutation({ mutationFn: (id: string) => catalogsApi.removeColor(id), onSuccess: invalidate })
}
