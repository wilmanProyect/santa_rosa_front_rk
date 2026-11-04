import { http } from '@/shared/api/http-client'
import type { Paginated } from '@/shared/types/api.types'
import type {
  BatchHealthRecordRequest,
  CreateHealthRecordRequest,
  HealthRecord,
  HealthRecordFilters,
  ProductFilters,
  ProductRequest,
  Reminders,
  UpdateHealthRecordRequest,
  VeterinaryProduct,
} from '../types/health.types'

export const productsApi = {
  list: (filters: ProductFilters = {}) =>
    http<VeterinaryProduct[]>('/veterinary-products', { query: { ...filters } }),
  create: (body: ProductRequest) =>
    http<VeterinaryProduct>('/veterinary-products', { method: 'POST', body }),
  update: (id: string, body: ProductRequest) =>
    http<VeterinaryProduct>(`/veterinary-products/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => http<void>(`/veterinary-products/${id}`, { method: 'DELETE' }),
}

export const healthRecordsApi = {
  list: (filters: HealthRecordFilters, signal?: AbortSignal) =>
    http<Paginated<HealthRecord>>('/health-records', { query: { ...filters }, signal }),
  create: (body: CreateHealthRecordRequest) =>
    http<HealthRecord>('/health-records', { method: 'POST', body }),
  /** Aplicación masiva: todo o nada. */
  batch: (body: BatchHealthRecordRequest) =>
    http<HealthRecord[]>('/health-records/batch', { method: 'POST', body }),
  update: (id: string, body: UpdateHealthRecordRequest) =>
    http<HealthRecord>(`/health-records/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => http<void>(`/health-records/${id}`, { method: 'DELETE' }),
}

export const remindersApi = {
  /** Lo programado hasta `until` (por defecto 7 días), incluidos los atrasados. */
  get: (until?: string) => http<Reminders>('/reminders', { query: { until } }),
}
