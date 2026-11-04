import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { photosApi } from '../api/animals.api'
import type { UpdatePhotoRequest } from '../types/animal.types'
import { animalsKeys } from './useAnimals'

export const photosKeys = {
  all: (animalId: string) => ['animal-photos', animalId] as const,
  page: (animalId: string, page: number) => [...photosKeys.all(animalId), page] as const,
}

/** Margen antes del vencimiento de las URL firmadas para pedir unas nuevas. */
const URL_REFRESH_MARGIN_MS = 60_000

export function usePhotos(animalId: string, page: number, limit: number) {
  const query = useQuery({
    queryKey: photosKeys.page(animalId, page),
    queryFn: () => photosApi.list(animalId, page, limit),
    placeholderData: keepPreviousData,
    // Las URL vencen: nunca se reutilizan de una visita anterior sin revalidar.
    staleTime: 0,
  })

  // Las URL firmadas vencen en ~15 min: se recarga la página de fotos un poco antes.
  const expiresAt = query.data?.items[0]?.urlsExpireAt
  const { refetch } = query
  useEffect(() => {
    if (!expiresAt) return
    const msLeft = Date.parse(expiresAt) - Date.now() - URL_REFRESH_MARGIN_MS
    const timer = setTimeout(() => void refetch(), Math.max(msLeft, 0))
    return () => clearTimeout(timer)
  }, [expiresAt, refetch])

  return query
}

/** Tras cambiar fotos se recargan la galería y la ficha/listados (cambia la foto principal). */
function useInvalidatePhotos() {
  const queryClient = useQueryClient()
  return (animalId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: photosKeys.all(animalId) }),
      queryClient.invalidateQueries({ queryKey: animalsKeys.detail(animalId) }),
      queryClient.invalidateQueries({ queryKey: animalsKeys.lists }),
    ])
}

export function useUpdatePhoto() {
  const invalidate = useInvalidatePhotos()
  return useMutation({
    mutationFn: ({ animalId, photoId, body }: { animalId: string; photoId: string; body: UpdatePhotoRequest }) =>
      photosApi.update(animalId, photoId, body),
    onSuccess: (_data, { animalId }) => invalidate(animalId),
  })
}

export function useSetPrimaryPhoto() {
  const invalidate = useInvalidatePhotos()
  return useMutation({
    mutationFn: ({ animalId, photoId }: { animalId: string; photoId: string }) =>
      photosApi.setPrimary(animalId, photoId),
    onSuccess: (_data, { animalId }) => invalidate(animalId),
  })
}

export function useDeletePhoto() {
  const invalidate = useInvalidatePhotos()
  return useMutation({
    mutationFn: ({ animalId, photoId }: { animalId: string; photoId: string }) =>
      photosApi.remove(animalId, photoId),
    onSuccess: (_data, { animalId }) => invalidate(animalId),
  })
}

/** Para refrescar desde fuera (p. ej. al terminar una subida múltiple). */
export function usePhotosInvalidation() {
  return useInvalidatePhotos()
}
