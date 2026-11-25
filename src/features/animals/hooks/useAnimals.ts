import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { animalsApi } from '../api/animals.api'
import type {
  AnimalDetail,
  AnimalFilters,
  ChangeAnimalStatusRequest,
  ConfirmGeneticCategoryRequest,
  CreateAnimalRequest,
  UpdateAnimalRequest,
} from '../types/animal.types'

export const animalsKeys = {
  all: ['animals'] as const,
  lists: ['animals', 'list'] as const,
  list: (filters: AnimalFilters) => [...animalsKeys.lists, filters] as const,
  detail: (id: string) => [...animalsKeys.all, 'detail', id] as const,
  categoryHistory: (id: string) => [...animalsKeys.all, 'detail', id, 'genetic-category'] as const,
  /** Bajo `detail`: se refresca cuando cambia la ficha. */
  pedigree: (id: string, generations: number) => [...animalsKeys.all, 'detail', id, 'pedigree', generations] as const,
}

export function useAnimals(filters: AnimalFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: animalsKeys.list(filters),
    queryFn: ({ signal }) => animalsApi.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  })
}

export function useAnimal(id: string | undefined) {
  return useQuery({
    queryKey: animalsKeys.detail(id ?? ''),
    queryFn: () => animalsApi.get(id!),
    enabled: !!id,
  })
}

export function usePedigree(id: string, generations: number) {
  return useQuery({
    queryKey: animalsKeys.pedigree(id, generations),
    queryFn: () => animalsApi.pedigree(id, generations),
    // Al cambiar de generaciones se mantiene el árbol anterior; al cambiar de animal, no.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === id ? previous : undefined),
  })
}

/** Guarda el detalle devuelto y refresca los listados (la ficha de los padres muestra sus crías). */
function useOnAnimalChanged() {
  const queryClient = useQueryClient()
  return async (animal: AnimalDetail) => {
    queryClient.setQueryData(animalsKeys.detail(animal.id), animal)
    await queryClient.invalidateQueries({ queryKey: animalsKeys.lists })
  }
}

export function useCreateAnimal() {
  const onChanged = useOnAnimalChanged()
  return useMutation({
    mutationFn: (body: CreateAnimalRequest) => animalsApi.create(body),
    onSuccess: onChanged,
  })
}

export function useUpdateAnimal() {
  const onChanged = useOnAnimalChanged()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAnimalRequest }) =>
      animalsApi.update(id, body),
    onSuccess: onChanged,
  })
}

/**
 * Claves de `reproduction` y de los recordatorios. Se repiten aquí para no depender de esas
 * features: registrar la muerte de una hembra cierra su monta abierta (DAM_DIED), y
 * corregir el estado la reabre.
 */
const REPRODUCTION_KEY = ['reproduction'] as const
const REMINDERS_KEY = ['reminders'] as const

export function useChangeAnimalStatus() {
  const queryClient = useQueryClient()
  const onChanged = useOnAnimalChanged()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChangeAnimalStatusRequest }) =>
      animalsApi.changeStatus(id, body),
    onSuccess: (animal) =>
      Promise.all([
        onChanged(animal),
        queryClient.invalidateQueries({ queryKey: REPRODUCTION_KEY }),
        queryClient.invalidateQueries({ queryKey: REMINDERS_KEY }),
        // Un animal que sale del inventario deja de tener controles.
        queryClient.invalidateQueries({ queryKey: ['controls'] }),
      ]),
  })
}

export function useDeleteAnimal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => animalsApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: animalsKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: animalsKeys.lists })
    },
  })
}

export function useUploadCertificate() {
  const onChanged = useOnAnimalChanged()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => animalsApi.uploadCertificate(id, file),
    onSuccess: onChanged,
  })
}

export function useGeneticCategoryHistory(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: animalsKeys.categoryHistory(id),
    queryFn: () => animalsApi.geneticCategoryHistory(id),
    enabled: options.enabled,
  })
}

/** Al confirmar cambian la ficha (categoría y certificado), su historial y los listados. */
export function useConfirmGeneticCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ConfirmGeneticCategoryRequest }) =>
      animalsApi.confirmGeneticCategory(id, body),
    onSuccess: (_data, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: animalsKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: animalsKeys.lists }),
      ]),
  })
}

export function useRemoveCertificate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => animalsApi.removeCertificate(id),
    onSuccess: (_data, id) => queryClient.invalidateQueries({ queryKey: animalsKeys.detail(id) }),
  })
}
