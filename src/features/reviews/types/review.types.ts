export type ReviewStatus = 'OPEN' | 'RESOLVED'
export type ReviewCategory = 'PARENTAGE' | 'MISSING_RECORD' | 'DATES' | 'IDENTIFIER' | 'OTHER'
export type ReviewEntityType = 'ANIMAL' | 'BIRTH' | 'BREEDING_SERVICE'

export interface ReviewTarget {
  entityType: ReviewEntityType
  entityId: string
  /** Papel del registro en el aviso, por ejemplo "Cría" o "Madre según la planilla". */
  role: string | null
  /** "CSR-12 FOEMA", "Parto de 55 JADE del 13/09/2025"… */
  label: string
  /** false si el registro fue eliminado. */
  exists: boolean
}

export interface DataReview {
  id: string
  category: ReviewCategory
  message: string
  source: string | null
  status: ReviewStatus
  resolution: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  targets: ReviewTarget[]
  createdAt: string
  createdBy: string | null
  updatedAt: string
  updatedBy: string | null
}

export interface ReviewFilters {
  status?: ReviewStatus
  category?: ReviewCategory
  entityType?: ReviewEntityType
  entityId?: string
  search?: string
  page?: number
  limit?: number
}

export interface OpenReviewTargets {
  entityType: ReviewEntityType
  totalOpen: number
  items: { entityId: string; count: number }[]
}

export interface CreateReviewRequest {
  category: ReviewCategory
  message: string
  source?: string
  targets: { entityType: ReviewEntityType; entityId: string; role?: string }[]
}

export const REVIEW_CATEGORY_LABELS: Record<ReviewCategory, string> = {
  PARENTAGE: 'Madre o padre',
  MISSING_RECORD: 'Falta un registro',
  DATES: 'Fechas',
  IDENTIFIER: 'Identificación',
  OTHER: 'Otro',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  OPEN: 'Pendiente',
  RESOLVED: 'Corregido',
}

export const REVIEW_ENTITY_LABELS: Record<ReviewEntityType, string> = {
  ANIMAL: 'Animal',
  BIRTH: 'Parto',
  BREEDING_SERVICE: 'Monta',
}
