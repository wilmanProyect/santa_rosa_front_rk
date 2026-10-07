import { http } from '@/shared/api/http-client'
import type { Area, AreaFilters, CreateAreaRequest, UpdateAreaRequest } from '../types/area.types'

export const areasApi = {
  list: (filters: AreaFilters = {}, signal?: AbortSignal) =>
    http<Area[]>('/areas', { query: { ...filters }, signal }),

  get: (id: string) => http<Area>(`/areas/${id}`),

  create: (body: CreateAreaRequest) => http<Area>('/areas', { method: 'POST', body }),

  update: (id: string, body: UpdateAreaRequest) =>
    http<Area>(`/areas/${id}`, { method: 'PATCH', body }),

  remove: (id: string) => http<void>(`/areas/${id}`, { method: 'DELETE' }),
}
