import { http } from '@/shared/api/http-client'
import type { Paginated } from '@/shared/types/api.types'
import type {
  CreateReviewRequest,
  DataReview,
  OpenReviewTargets,
  ReviewEntityType,
  ReviewFilters,
} from '../types/review.types'

export const reviewsApi = {
  list: (filters: ReviewFilters, signal?: AbortSignal) =>
    http<Paginated<DataReview>>('/reviews', { query: { ...filters }, signal }),
  get: (id: string) => http<DataReview>(`/reviews/${id}`),
  /** Registros de un tipo con avisos pendientes, para marcarlos en los listados. */
  openTargets: (entityType: ReviewEntityType, signal?: AbortSignal) =>
    http<OpenReviewTargets>('/reviews/open-targets', { query: { entityType }, signal }),
  create: (body: CreateReviewRequest) => http<DataReview>('/reviews', { method: 'POST', body }),
  resolve: (id: string, resolution: string) =>
    http<DataReview>(`/reviews/${id}/resolve`, { method: 'POST', body: { resolution } }),
  reopen: (id: string) => http<DataReview>(`/reviews/${id}/reopen`, { method: 'POST' }),
}
