import { http } from '@/shared/api/http-client'
import type { Paginated } from '@/shared/types/api.types'
import type {
  AnimalReproduction,
  Birth,
  BirthFilters,
  BreedingCheckRequest,
  BreedingEvaluation,
  BreedingService,
  BreedingServiceFilters,
  CreateBreedingServiceRequest,
  CreatePregnancyCheckRequest,
  PregnancyCheck,
  RecordAbortionRequest,
  RegisterBirthRequest,
  RegisterUnplannedBirthRequest,
  ReproductionStats,
  ReproductionStatsFilters,
  UpdateBirthRequest,
  UpdateBreedingServiceRequest,
} from '../types/reproduction.types'

export const breedingApi = {
  /** Revisa una pareja sin guardar nada (bloqueos, avisos, parentesco y categoría esperada). */
  check: (body: BreedingCheckRequest, signal?: AbortSignal) =>
    http<BreedingEvaluation>('/breeding/check', { method: 'POST', body, signal }),

  list: (filters: BreedingServiceFilters, signal?: AbortSignal) =>
    http<Paginated<BreedingService>>('/breeding/services', { query: { ...filters }, signal }),
  get: (id: string) => http<BreedingService>(`/breeding/services/${id}`),
  create: (body: CreateBreedingServiceRequest) =>
    http<BreedingService>('/breeding/services', { method: 'POST', body }),
  update: (id: string, body: UpdateBreedingServiceRequest) =>
    http<BreedingService>(`/breeding/services/${id}`, { method: 'PATCH', body }),
  /** Borrado lógico de la monta y sus diagnósticos. 409 si tiene parto. */
  remove: (id: string) => http<void>(`/breeding/services/${id}`, { method: 'DELETE' }),

  addCheck: (id: string, body: CreatePregnancyCheckRequest) =>
    http<{ check: PregnancyCheck; service: BreedingService }>(`/breeding/services/${id}/pregnancy-checks`, {
      method: 'POST',
      body,
    }),
  removeCheck: (id: string, checkId: string) =>
    http<BreedingService>(`/breeding/services/${id}/pregnancy-checks/${checkId}`, { method: 'DELETE' }),

  recordAbortion: (id: string, body: RecordAbortionRequest) =>
    http<BreedingService>(`/breeding/services/${id}/abortion`, { method: 'POST', body }),
  cancelAbortion: (id: string) =>
    http<BreedingService>(`/breeding/services/${id}/abortion`, { method: 'DELETE' }),
}

export const birthsApi = {
  /** Parto de una monta: crea las crías vivas como animales. */
  registerForService: (serviceId: string, body: RegisterBirthRequest) =>
    http<Birth>(`/breeding/services/${serviceId}/birth`, { method: 'POST', body }),
  /** Parto sin monta registrada. */
  registerUnplanned: (body: RegisterUnplannedBirthRequest) =>
    http<Birth>('/breeding/births', { method: 'POST', body }),

  list: (filters: BirthFilters, signal?: AbortSignal) =>
    http<Paginated<Birth>>('/breeding/births', { query: { ...filters }, signal }),
  get: (id: string) => http<Birth>(`/breeding/births/${id}`),
  update: (id: string, body: UpdateBirthRequest) =>
    http<Birth>(`/breeding/births/${id}`, { method: 'PATCH', body }),
}

export const reproductionApi = {
  stats: (filters: ReproductionStatsFilters) =>
    http<ReproductionStats>('/breeding/stats', { query: { ...filters } }),
  /** Montas y partos del animal (como madre, padre o cría). */
  animal: (animalId: string) => http<AnimalReproduction>(`/animals/${animalId}/reproduction`),
}
