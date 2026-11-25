import { http } from '@/shared/api/http-client'
import type { EntityRef, Paginated } from '@/shared/types/api.types'
import type {
  ActivityFilters,
  AnimalActivityFilters,
  AuditEntity,
  AuditPage,
  LoginAttempt,
  LoginHistoryFilters,
} from '../types/audit.types'

export const auditApi = {
  loginHistory: (filters: LoginHistoryFilters, signal?: AbortSignal) =>
    http<Paginated<LoginAttempt>>('/auth/login-history', { query: { ...filters }, signal }),

  activity: (filters: ActivityFilters, signal?: AbortSignal) =>
    http<AuditPage>('/audit/activity', { query: { ...filters }, signal }),

  entities: () => http<AuditEntity[]>('/audit/entities'),

  animalActivity: (animalId: string, filters: AnimalActivityFilters, signal?: AbortSignal) =>
    http<AuditPage>(`/animals/${animalId}/activity`, { query: { ...filters }, signal }),

  /**
   * Usuarios para el filtro. Se consulta directo (y no con la feature `users`) para no crear
   * una dependencia circular: la ficha de usuario usa el historial de esta feature.
   */
  userOptions: () =>
    http<Paginated<EntityRef & { fullName: string; username: string }>>('/users', {
      query: { limit: 100 },
    }),
}
