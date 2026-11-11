import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { animalsKeys } from '@/features/animals'
import { birthsApi, breedingApi, reproductionApi } from '../api/reproduction.api'
import type {
  Birth,
  BirthFilters,
  BreedingCheckRequest,
  BreedingService,
  BreedingServiceFilters,
  CreateBreedingServiceRequest,
  CreatePregnancyCheckRequest,
  RecordAbortionRequest,
  RegisterBirthRequest,
  RegisterUnplannedBirthRequest,
  ReproductionStatsFilters,
  UpdateBirthRequest,
  UpdateBreedingServiceRequest,
} from '../types/reproduction.types'

export const reproductionKeys = {
  all: ['reproduction'] as const,
  services: ['reproduction', 'services'] as const,
  serviceList: (filters: BreedingServiceFilters) => [...reproductionKeys.services, 'list', filters] as const,
  service: (id: string) => [...reproductionKeys.services, 'detail', id] as const,
  births: ['reproduction', 'births'] as const,
  birthList: (filters: BirthFilters) => [...reproductionKeys.births, 'list', filters] as const,
  birth: (id: string) => [...reproductionKeys.births, 'detail', id] as const,
  stats: (filters: ReproductionStatsFilters) => [...reproductionKeys.all, 'stats', filters] as const,
  animal: (animalId: string) => [...reproductionKeys.all, 'animal', animalId] as const,
  check: (body: BreedingCheckRequest) => [...reproductionKeys.all, 'check', body] as const,
}

/**
 * Clave de GET /reminders (lo consulta la feature `health`). Se repite aquí para no
 * depender de `health`: los diagnósticos y partos pendientes salen de las montas.
 */
const REMINDERS_KEY = ['reminders'] as const

// ---------- Consultas ----------
export function useBreedingServices(filters: BreedingServiceFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: reproductionKeys.serviceList(filters),
    queryFn: ({ signal }) => breedingApi.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  })
}

export function useBreedingService(id: string | undefined) {
  return useQuery({
    queryKey: reproductionKeys.service(id ?? ''),
    queryFn: () => breedingApi.get(id!),
    enabled: !!id,
  })
}

/** Revisión en vivo de la pareja: solo cuando están la hembra, el macho, el tipo y la fecha. */
export function useBreedingCheck(body: BreedingCheckRequest | null) {
  return useQuery({
    queryKey: reproductionKeys.check(body ?? { damId: '', sireId: '' }),
    queryFn: ({ signal }) => breedingApi.check(body!, signal),
    enabled: body !== null,
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
  })
}

export function useBirths(filters: BirthFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: reproductionKeys.birthList(filters),
    queryFn: ({ signal }) => birthsApi.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  })
}

export function useBirth(id: string | undefined) {
  return useQuery({
    queryKey: reproductionKeys.birth(id ?? ''),
    queryFn: () => birthsApi.get(id!),
    enabled: !!id,
  })
}

export function useReproductionStats(filters: ReproductionStatsFilters) {
  return useQuery({
    queryKey: reproductionKeys.stats(filters),
    queryFn: () => reproductionApi.stats(filters),
    placeholderData: keepPreviousData,
  })
}

export function useAnimalReproduction(animalId: string) {
  return useQuery({
    queryKey: reproductionKeys.animal(animalId),
    queryFn: () => reproductionApi.animal(animalId),
  })
}

// ---------- Mutaciones ----------
/**
 * Una monta o un parto cambian los listados, los indicadores, el historial de los padres
 * y los recordatorios. Un parto además crea animales (las crías).
 */
function useInvalidateReproduction() {
  const queryClient = useQueryClient()
  return (options: { animals?: boolean } = {}) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: reproductionKeys.all }),
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY }),
      options.animals && queryClient.invalidateQueries({ queryKey: animalsKeys.all }),
    ])
}

/** Guarda la monta devuelta y refresca lo relacionado. */
function useOnServiceChanged() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateReproduction()
  return (service: BreedingService) => {
    queryClient.setQueryData(reproductionKeys.service(service.id), service)
    return invalidate()
  }
}

export function useCreateBreedingService() {
  const onChanged = useOnServiceChanged()
  return useMutation({
    mutationFn: (body: CreateBreedingServiceRequest) => breedingApi.create(body),
    onSuccess: onChanged,
  })
}

export function useUpdateBreedingService() {
  const onChanged = useOnServiceChanged()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBreedingServiceRequest }) => breedingApi.update(id, body),
    onSuccess: onChanged,
  })
}

export function useDeleteBreedingService() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateReproduction()
  return useMutation({
    mutationFn: (id: string) => breedingApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: reproductionKeys.service(id) })
      return invalidate()
    },
  })
}

export function useAddPregnancyCheck() {
  const onChanged = useOnServiceChanged()
  return useMutation({
    mutationFn: ({ serviceId, body }: { serviceId: string; body: CreatePregnancyCheckRequest }) =>
      breedingApi.addCheck(serviceId, body),
    onSuccess: ({ service }) => onChanged(service),
  })
}

export function useRemovePregnancyCheck() {
  const onChanged = useOnServiceChanged()
  return useMutation({
    mutationFn: ({ serviceId, checkId }: { serviceId: string; checkId: string }) =>
      breedingApi.removeCheck(serviceId, checkId),
    onSuccess: onChanged,
  })
}

export function useRecordAbortion() {
  const onChanged = useOnServiceChanged()
  return useMutation({
    mutationFn: ({ serviceId, body }: { serviceId: string; body: RecordAbortionRequest }) =>
      breedingApi.recordAbortion(serviceId, body),
    onSuccess: onChanged,
  })
}

export function useCancelAbortion() {
  const onChanged = useOnServiceChanged()
  return useMutation({
    mutationFn: (serviceId: string) => breedingApi.cancelAbortion(serviceId),
    onSuccess: onChanged,
  })
}

type RegisterBirthInput =
  | { serviceId: string; body: RegisterBirthRequest }
  | { serviceId?: undefined; body: RegisterUnplannedBirthRequest }

export function useRegisterBirth() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateReproduction()
  return useMutation({
    mutationFn: (input: RegisterBirthInput) =>
      input.serviceId
        ? birthsApi.registerForService(input.serviceId, input.body)
        : birthsApi.registerUnplanned(input.body as RegisterUnplannedBirthRequest),
    onSuccess: (birth: Birth) => {
      queryClient.setQueryData(reproductionKeys.birth(birth.id), birth)
      return invalidate({ animals: true })
    },
  })
}

export function useUpdateBirth() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateReproduction()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBirthRequest }) => birthsApi.update(id, body),
    onSuccess: (birth) => {
      queryClient.setQueryData(reproductionKeys.birth(birth.id), birth)
      return invalidate()
    },
  })
}
