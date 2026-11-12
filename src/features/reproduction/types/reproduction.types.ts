import type { GeneticCategory, Sex, Species } from '@/features/animals'
import type { AuditFields, PaginationParams } from '@/shared/types/api.types'

// ---------- Valores fijos ----------
export type ServiceType = 'DIRECTED' | 'ARTIFICIAL_INSEMINATION'
export type ServiceStatus = 'PENDING' | 'PREGNANT' | 'EMPTY' | 'BIRTHED' | 'ABORTED'
export type PregnancyCheckMethod = 'ULTRASOUND' | 'OBSERVATION'
export type PregnancyCheckResult = 'PREGNANT' | 'EMPTY'
export type BirthAssistance = 'NORMAL' | 'ASSISTED' | 'CESAREAN'
export type LitterType = 'SINGLE' | 'TWINS' | 'TRIPLETS' | 'QUADRUPLETS'
export type BreedingBlockCode = 'INVALID_PAIR' | 'OPEN_SERVICE' | 'KINSHIP_CONFLICT'

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  DIRECTED: 'Monta dirigida',
  ARTIFICIAL_INSEMINATION: 'Inseminación artificial',
}

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  PENDING: 'Sin diagnóstico',
  PREGNANT: 'Preñada',
  EMPTY: 'Vacía',
  BIRTHED: 'Parió',
  ABORTED: 'Abortó',
}

export const PREGNANCY_CHECK_METHOD_LABELS: Record<PregnancyCheckMethod, string> = {
  ULTRASOUND: 'Ecografía',
  OBSERVATION: 'Observación',
}

export const PREGNANCY_CHECK_RESULT_LABELS: Record<PregnancyCheckResult, string> = {
  PREGNANT: 'Preñada',
  EMPTY: 'Vacía',
}

/** Días máximos entre el ingreso y la salida (igual que la API). */
export const MAX_SERVICE_DAYS = 30

export const BIRTH_ASSISTANCE_LABELS: Record<BirthAssistance, string> = {
  NORMAL: 'Normal',
  ASSISTED: 'Asistido',
  CESAREAN: 'Cesárea',
}

export const LITTER_TYPE_LABELS: Record<LitterType, string> = {
  SINGLE: 'Simple',
  TWINS: 'Gemelos',
  TRIPLETS: 'Trillizos',
  QUADRUPLETS: 'Cuatrillizos',
}

/** Tipo de parto según el número de crías (1 a 4). */
export const LITTER_TYPE_BY_SIZE: Record<number, LitterType> = {
  1: 'SINGLE',
  2: 'TWINS',
  3: 'TRIPLETS',
  4: 'QUADRUPLETS',
}

/** Montas abiertas: la hembra no puede tener otra mientras tanto. */
export const OPEN_SERVICE_STATUSES: ServiceStatus[] = ['PENDING', 'PREGNANT']

export const MAX_LITTER_SIZE = 4

/** Códigos de negocio de los 409 del módulo. */
export const REPRODUCTION_ERROR_CODES = {
  OPEN_SERVICE: 'OPEN_SERVICE',
  KINSHIP_CONFLICT: 'KINSHIP_CONFLICT',
  BIRTH_TOO_CLOSE: 'BIRTH_TOO_CLOSE',
} as const

// ---------- Monta ----------
export interface BreedingAnimalRef {
  id: string
  earTag: string | null
  name: string | null
  isExternal: boolean
  geneticCategory: GeneticCategory | null
}

export interface CommonAncestor {
  id: string
  earTag: string | null
  name: string | null
  /** 0: es la propia hembra (o el propio macho). */
  damGeneration: number
  sireGeneration: number
  description: string
}

export interface KinshipDetail {
  relationship: string | null
  /** De la cría (Wright), de 0 a 1. */
  inbreedingCoefficient: number
  commonAncestors: CommonAncestor[]
}

export interface BreedingBlock {
  code: BreedingBlockCode
  message: string
  overridable: boolean
  serviceId?: string
}

/** Respuesta de POST /breeding/check: revisa la pareja sin guardar nada. */
export interface BreedingEvaluation {
  allowed: boolean
  blocks: BreedingBlock[]
  warnings: string[]
  dam: BreedingAnimalRef
  sire: BreedingAnimalRef
  type: ServiceType
  serviceDate: string
  expectedBirthDate: string
  expectedOffspringCategory: GeneticCategory | null
  categoryUpgrade: boolean
  kinship: KinshipDetail & {
    related: boolean
    knownAncestors: { dam: number; sire: number; possible: number }
  }
}

export interface BreedingCheckRequest {
  damId: string
  sireId: string
  type?: ServiceType
  serviceDate?: string
}

export interface PregnancyCheck {
  id: string
  checkedAt: string
  method: PregnancyCheckMethod
  result: PregnancyCheckResult
  fetusCount: number | null
  notes: string | null
  createdAt: string
  createdBy: string | null
}

export interface BreedingService extends AuditFields {
  id: string
  dam: BreedingAnimalRef
  sire: BreedingAnimalRef
  species: Species
  type: ServiceType
  /** Fecha de ingreso; el parto probable se cuenta desde ella. */
  serviceDate: string
  /** Fecha de salida (la monta puede durar varios días). */
  exitDate: string | null
  strawCode: string | null
  /** Usuario que registró la monta (automático). */
  registeredBy: { id: string; username: string; fullName: string } | null
  expectedBirthDate: string
  status: ServiceStatus
  expectedOffspringCategory: GeneticCategory | null
  expectedFetusCount: number | null
  inbreedingCoefficient: number
  kinshipOverride: { reason: string; authorizedBy: string; authorizedAt: string } | null
  abortion: { date: string; cause: string | null } | null
  checks: PregnancyCheck[]
  notes: string | null
  /** Solo al crear. */
  warnings?: string[]
}

export interface BreedingServiceFilters extends PaginationParams {
  status?: ServiceStatus
  type?: ServiceType
  species?: Species
  /** Como madre o padre. */
  animalId?: string
  damId?: string
  sireId?: string
  from?: string
  to?: string
  /** true: solo las autorizadas pese al parentesco. */
  kinshipOverride?: boolean
}

export interface CreateBreedingServiceRequest {
  damId: string
  sireId: string
  type: ServiceType
  serviceDate: string
  exitDate?: string
  strawCode?: string
  notes?: string
  overrideKinship?: boolean
  overrideReason?: string
}

/** La pareja y el tipo no cambian; `null` vacía los opcionales. */
export interface UpdateBreedingServiceRequest {
  serviceDate?: string
  exitDate?: string | null
  strawCode?: string | null
  notes?: string | null
}

export interface CreatePregnancyCheckRequest {
  checkedAt: string
  method: PregnancyCheckMethod
  result: PregnancyCheckResult
  fetusCount?: number
  notes?: string
}

export interface RecordAbortionRequest {
  date: string
  cause?: string
}

/** Cuerpo del 409 KINSHIP_CONFLICT al guardar una monta. */
export interface KinshipConflictBody {
  code: 'KINSHIP_CONFLICT'
  message: string
  kinship: KinshipDetail
  canOverride: boolean
}

// ---------- Parto ----------
export interface BirthOffspring {
  position: number
  sex: Sex | null
  bornAlive: boolean
  birthWeightKg: number | null
  animal: {
    id: string
    earTag: string | null
    name: string | null
    /** Solo en la respuesta del registro. */
    geneticCategory?: GeneticCategory | null
    geneticCategoryConfirmed?: boolean
  } | null
}

export interface Birth extends AuditFields {
  id: string
  /** null: parto sin monta o histórico. */
  serviceId: string | null
  dam: BreedingAnimalRef
  sire: BreedingAnimalRef | null
  species: Species
  birthDate: string
  assistance: BirthAssistance | null
  litterSize: number
  litterType: LitterType
  bornAlive: number
  bornDead: number
  /** Reconstruido por la migración a partir de los animales ya cargados. */
  isHistorical: boolean
  offspring: BirthOffspring[]
  notes: string | null
  /** Solo al registrar. */
  warnings?: string[]
}

export interface BirthFilters extends PaginationParams {
  species?: Species
  /** Como madre, padre o cría. */
  animalId?: string
  damId?: string
  sireId?: string
  from?: string
  to?: string
  litterSize?: number
  isHistorical?: boolean
}

export interface BirthOffspringInput {
  bornAlive: boolean
  /** Obligatorio si nació viva. */
  sex?: Sex
  /** Obligatorio si nació viva. */
  earTag?: string
  birthWeightKg?: number
  name?: string
  /** Por defecto, la raza de la madre. */
  breedId?: string
  colorId?: string
  notes?: string
}

export interface RegisterBirthRequest {
  birthDate: string
  assistance?: BirthAssistance
  notes?: string
  offspring: BirthOffspringInput[]
}

/** Parto sin monta registrada. */
export interface RegisterUnplannedBirthRequest extends RegisterBirthRequest {
  damId: string
  sireId?: string
}

export interface UpdateBirthRequest {
  assistance?: BirthAssistance | null
  notes?: string | null
}

// ---------- Indicadores ----------
export interface ReproductionStatsFilters {
  species?: Species
  from?: string
  to?: string
}

export interface ReproductionStats {
  filters: ReproductionStatsFilters
  services: {
    total: number
    withResult: number
    conceptions: number
    kinshipOverrides: number
    byStatus: Record<ServiceStatus, number>
    byType: Record<ServiceType, number>
  }
  births: {
    total: number
    historical: number
    offspring: number
    bornAlive: number
    bornDead: number
    byLitterSize: Record<'1' | '2' | '3' | '4', number>
    averageIntervalDays: number | null
    intervalsCounted: number
  }
  sires: {
    sire: { id: string; earTag: string | null; name: string | null }
    services: number
    servicesWithResult: number
    conceptions: number
    births: number
    offspring: number
    bornAlive: number
  }[]
  indicators: {
    /** % de concepciones sobre las montas con resultado. */
    fertilityRate: number | null
    /** Crías por parto. */
    prolificacy: number | null
    /** % de partos con 2 o más crías. */
    multipleBirthRate: number | null
    /** % de crías nacidas muertas. */
    stillbirthRate: number | null
    averageBirthIntervalDays: number | null
  }
}

// ---------- Historial del animal ----------
export interface AnimalReproduction {
  summary: {
    births: number
    offspring: number
    bornAlive: number
    multipleBirths: number
    averageLitterSize: number | null
    lastBirthDate: string | null
    /** En hembras: su monta abierta, si tiene. */
    openService: {
      id: string
      status: ServiceStatus
      serviceDate: string
      expectedBirthDate: string
      sire: BreedingAnimalRef
    } | null
  }
  services: BreedingService[]
  births: Birth[]
}

// ---------- Recordatorios ----------
interface ReminderAnimalRef {
  id: string
  earTag: string | null
  name: string | null
}

export interface PendingPregnancyCheck {
  serviceId: string
  dam: ReminderAnimalRef
  sire: ReminderAnimalRef
  serviceDate: string
  checkFrom: string
  /** Pasaron 45 días sin diagnóstico. */
  overdue: boolean
}

export interface UpcomingBirth {
  serviceId: string
  dam: ReminderAnimalRef
  sire: ReminderAnimalRef
  serviceDate: string
  status: ServiceStatus
  expectedBirthDate: string
  expectedFetusCount: number | null
  /** Pasó la fecha probable sin parto registrado. */
  overdue: boolean
}
