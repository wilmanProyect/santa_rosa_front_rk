import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { weighingsApi } from '../api/animals.api'
import type { BatchWeighingRequest, CreateWeighingRequest, UpdateWeighingRequest } from '../types/animal.types'
import { animalsKeys } from './useAnimals'

export const weighingsKeys = {
  list: (animalId: string) => ['weighings', animalId] as const,
}

export function useWeighings(animalId: string) {
  return useQuery({
    queryKey: weighingsKeys.list(animalId),
    queryFn: () => weighingsApi.list(animalId),
  })
}

/**
 * Los pesajes alimentan la ficha (peso al nacer, al destete y último pesaje) y los
 * recordatorios: tras un cambio se refrescan todos.
 */
function useInvalidateWeighings() {
  const queryClient = useQueryClient()
  return (animalIds: string[]) =>
    Promise.all([
      ...animalIds.flatMap((id) => [
        queryClient.invalidateQueries({ queryKey: weighingsKeys.list(id) }),
        queryClient.invalidateQueries({ queryKey: animalsKeys.detail(id) }),
      ]),
      queryClient.invalidateQueries({ queryKey: ['reminders'] }),
    ])
}

export function useCreateWeighing() {
  const invalidate = useInvalidateWeighings()
  return useMutation({
    mutationFn: ({ animalId, body }: { animalId: string; body: CreateWeighingRequest }) =>
      weighingsApi.create(animalId, body),
    onSuccess: (_data, { animalId }) => invalidate([animalId]),
  })
}

export function useUpdateWeighing() {
  const invalidate = useInvalidateWeighings()
  return useMutation({
    mutationFn: ({ animalId, id, body }: { animalId: string; id: string; body: UpdateWeighingRequest }) =>
      weighingsApi.update(animalId, id, body),
    onSuccess: (_data, { animalId }) => invalidate([animalId]),
  })
}

export function useDeleteWeighing() {
  const invalidate = useInvalidateWeighings()
  return useMutation({
    mutationFn: ({ animalId, id }: { animalId: string; id: string }) => weighingsApi.remove(animalId, id),
    onSuccess: (_data, { animalId }) => invalidate([animalId]),
  })
}

export function useBatchWeighing() {
  const invalidate = useInvalidateWeighings()
  return useMutation({
    mutationFn: (body: BatchWeighingRequest) => weighingsApi.batch(body),
    onSuccess: (_data, body) => invalidate(body.items.map((i) => i.animalId)),
  })
}
