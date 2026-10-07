import type { AuditFields } from '@/shared/types/api.types'

export interface Area extends AuditFields {
  id: string
  name: string
  description: string
  isActive: boolean
}

export interface AreaFilters {
  isActive?: boolean
}

export interface CreateAreaRequest {
  name: string
  description?: string
}

export interface UpdateAreaRequest {
  name?: string
  description?: string
  isActive?: boolean
}
