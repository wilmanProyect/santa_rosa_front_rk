import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditApi } from '../api/audit.api'
import type { ActivityFilters, AnimalActivityFilters } from '../types/audit.types'

export const activityKeys = {
  activity: (filters: ActivityFilters) => ['audit', 'activity', filters] as const,
  entities: ['audit', 'entities'] as const,
  animal: (animalId: string, filters: AnimalActivityFilters) =>
    ['audit', 'animal-activity', animalId, filters] as const,
}

export function useActivity(filters: ActivityFilters) {
  return useQuery({
    queryKey: activityKeys.activity(filters),
    queryFn: ({ signal }) => auditApi.activity(filters, signal),
    placeholderData: keepPreviousData,
  })
}

/** Tablas registradas, para el filtro. No cambian mientras corre el backend. */
export function useAuditEntities() {
  return useQuery({
    queryKey: activityKeys.entities,
    queryFn: () => auditApi.entities(),
    staleTime: Infinity,
  })
}

export function useAnimalActivity(animalId: string, filters: AnimalActivityFilters) {
  return useQuery({
    queryKey: activityKeys.animal(animalId, filters),
    queryFn: ({ signal }) => auditApi.animalActivity(animalId, filters, signal),
    placeholderData: keepPreviousData,
  })
}
