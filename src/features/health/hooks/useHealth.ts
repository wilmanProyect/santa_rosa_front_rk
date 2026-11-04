import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { animalsKeys } from '@/features/animals'
import { healthRecordsApi, productsApi, remindersApi } from '../api/health.api'
import type {
  BatchHealthRecordRequest,
  CreateHealthRecordRequest,
  HealthRecordFilters,
  ProductFilters,
  ProductRequest,
  UpdateHealthRecordRequest,
} from '../types/health.types'

export const healthKeys = {
  products: ['veterinary-products'] as const,
  productList: (filters: ProductFilters) => [...healthKeys.products, filters] as const,
  records: ['health-records'] as const,
  recordList: (filters: HealthRecordFilters) => [...healthKeys.records, filters] as const,
  reminders: ['reminders'] as const,
}

// ---------- Productos ----------
export function useProducts(filters: ProductFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: healthKeys.productList(filters),
    queryFn: () => productsApi.list(filters),
    staleTime: 5 * 60_000,
    enabled: options.enabled,
  })
}

export function useSaveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: ProductRequest }) =>
      id ? productsApi.update(id, body) : productsApi.create(body),
    // El nombre del producto aparece en los eventos sanitarios.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: healthKeys.products }),
        queryClient.invalidateQueries({ queryKey: healthKeys.records }),
      ]),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: healthKeys.products }),
  })
}

// ---------- Eventos sanitarios ----------
export function useHealthRecords(filters: HealthRecordFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: healthKeys.recordList(filters),
    queryFn: ({ signal }) => healthRecordsApi.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  })
}

/**
 * Un evento puede abrir o cerrar un período de retiro (se ve en la ficha del animal)
 * y programar una dosis (recordatorios): se refresca todo lo relacionado.
 */
function useInvalidateHealth() {
  const queryClient = useQueryClient()
  return (animalIds: (string | null | undefined)[]) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: healthKeys.records }),
      queryClient.invalidateQueries({ queryKey: healthKeys.reminders }),
      ...animalIds
        .filter((id): id is string => !!id)
        .map((id) => queryClient.invalidateQueries({ queryKey: animalsKeys.detail(id) })),
    ])
}

export function useCreateHealthRecord() {
  const invalidate = useInvalidateHealth()
  return useMutation({
    mutationFn: (body: CreateHealthRecordRequest) => healthRecordsApi.create(body),
    onSuccess: (record) => invalidate([record.animalId]),
  })
}

export function useBatchHealthRecords() {
  const invalidate = useInvalidateHealth()
  return useMutation({
    mutationFn: (body: BatchHealthRecordRequest) => healthRecordsApi.batch(body),
    onSuccess: (_data, body) => invalidate(body.items.map((i) => i.animalId)),
  })
}

export function useUpdateHealthRecord() {
  const invalidate = useInvalidateHealth()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateHealthRecordRequest }) =>
      healthRecordsApi.update(id, body),
    onSuccess: (record) => invalidate([record.animalId]),
  })
}

export function useDeleteHealthRecord() {
  const invalidate = useInvalidateHealth()
  return useMutation({
    mutationFn: ({ id }: { id: string; animalId: string | null }) => healthRecordsApi.remove(id),
    onSuccess: (_data, { animalId }) => invalidate([animalId]),
  })
}

// ---------- Recordatorios ----------
export function useReminders(until?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...healthKeys.reminders, until ?? 'default'],
    queryFn: () => remindersApi.get(until),
    enabled: options.enabled,
  })
}
