import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { animalsApi } from '../api/animals.api'
import type {
  AnimalDetail,
  AnimalFilters,
  ChangeAnimalStatusRequest,
  CreateAnimalRequest,
  UpdateAnimalRequest,
} from '../types/animal.types'

export const animalsKeys = {
  all: ['animals'] as const,
  lists: ['animals', 'list'] as const,
  list: (filters: AnimalFilters) => [...animalsKeys.lists, filters] as const,
  detail: (id: string) => [...animalsKeys.all, 'detail', id] as const,
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

export function useChangeAnimalStatus() {
  const onChanged = useOnAnimalChanged()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChangeAnimalStatusRequest }) =>
      animalsApi.changeStatus(id, body),
    onSuccess: onChanged,
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

export function useRemoveCertificate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => animalsApi.removeCertificate(id),
    onSuccess: (_data, id) => queryClient.invalidateQueries({ queryKey: animalsKeys.detail(id) }),
  })
}
