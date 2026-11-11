import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { PERMISSIONS } from '@/shared/config/permissions'
import { reviewsApi } from '../api/reviews.api'
import type { CreateReviewRequest, ReviewEntityType, ReviewFilters } from '../types/review.types'

export const reviewsKeys = {
  all: ['reviews'] as const,
  list: (filters: ReviewFilters) => [...reviewsKeys.all, 'list', filters] as const,
  entity: (entityType: ReviewEntityType, entityId: string) =>
    [...reviewsKeys.all, 'entity', entityType, entityId] as const,
  openTargets: (entityType: ReviewEntityType) => [...reviewsKeys.all, 'open-targets', entityType] as const,
}

export function useReviews(filters: ReviewFilters) {
  return useQuery({
    queryKey: reviewsKeys.list(filters),
    queryFn: ({ signal }) => reviewsApi.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

/** Avisos pendientes de un registro (para el aviso de su ficha). Solo con `reviews:read`. */
export function useEntityReviews(entityType: ReviewEntityType, entityId: string | undefined) {
  const { can } = useAuth()
  return useQuery({
    queryKey: reviewsKeys.entity(entityType, entityId ?? ''),
    queryFn: ({ signal }) =>
      reviewsApi.list({ entityType, entityId, status: 'OPEN', limit: 50 }, signal),
    enabled: !!entityId && can(PERMISSIONS.REVIEWS_READ),
  })
}

/**
 * Ids de los registros de un tipo con avisos pendientes, para marcar las filas de
 * los listados. Una sola consulta por tipo, compartida por todas las filas.
 */
export function useOpenReviewTargets(entityType: ReviewEntityType) {
  const { can } = useAuth()
  return useQuery({
    queryKey: reviewsKeys.openTargets(entityType),
    queryFn: ({ signal }) => reviewsApi.openTargets(entityType, signal),
    enabled: can(PERMISSIONS.REVIEWS_READ),
    staleTime: 60_000,
    select: (data) => new Map(data.items.map((i) => [i.entityId, i.count])),
  })
}

function useInvalidateReviews() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: reviewsKeys.all })
}

export function useResolveReview() {
  const invalidate = useInvalidateReviews()
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) => reviewsApi.resolve(id, resolution),
    onSuccess: invalidate,
  })
}

export function useReopenReview() {
  const invalidate = useInvalidateReviews()
  return useMutation({ mutationFn: (id: string) => reviewsApi.reopen(id), onSuccess: invalidate })
}

export function useCreateReview() {
  const invalidate = useInvalidateReviews()
  return useMutation({ mutationFn: (body: CreateReviewRequest) => reviewsApi.create(body), onSuccess: invalidate })
}
