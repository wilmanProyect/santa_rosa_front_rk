import type { AuditFields, EntityRef, PaginationParams } from '@/shared/types/api.types'

// ---------- Valores fijos ----------
export type Species = 'SHEEP' | 'GOAT'
export type Sex = 'MALE' | 'FEMALE'
export type AnimalStatus = 'ALIVE' | 'DEAD' | 'SOLD' | 'SLAUGHTERED' | 'GIFTED' | 'EXCHANGED' | 'LOST'
export type EntryOrigin = 'BORN_ON_FARM' | 'PURCHASE' | 'DONATION' | 'GIFT' | 'INITIAL_STOCK'
export type GeneticCategory = 'COMMERCIAL' | 'BASE' | 'G1' | 'G2' | 'G3' | 'G4' | 'PO'

export const SPECIES_LABELS: Record<Species, string> = { SHEEP: 'Ovino', GOAT: 'Caprino' }

export const SEX_LABELS: Record<Sex, string> = { MALE: 'Macho', FEMALE: 'Hembra' }

export const ANIMAL_STATUS_LABELS: Record<AnimalStatus, string> = {
  ALIVE: 'Vivo',
  DEAD: 'Muerto',
  SOLD: 'Vendido',
  SLAUGHTERED: 'Faenado',
  GIFTED: 'Regalado',
  EXCHANGED: 'Intercambiado',
  LOST: 'Perdido',
}

export const ENTRY_ORIGIN_LABELS: Record<EntryOrigin, string> = {
  BORN_ON_FARM: 'Nacido en la cabaña',
  PURCHASE: 'Compra',
  DONATION: 'Donación',
  GIFT: 'Regalo',
  INITIAL_STOCK: 'Inventario inicial',
}

export const GENETIC_CATEGORY_LABELS: Record<GeneticCategory, string> = {
  COMMERCIAL: 'Comercial / General',
  BASE: 'Base',
  G1: 'Grado 1 (G1)',
  G2: 'Grado 2 (G2)',
  G3: 'Grado 3 (G3)',
  G4: 'Grado 4 (G4)',
  PO: 'Puro de origen (PO)',
}

/** Orden de las categorías, de menor a mayor (COMMERCIAL queda aparte). */
export const GENETIC_CATEGORY_ORDER: GeneticCategory[] = ['COMMERCIAL', 'BASE', 'G1', 'G2', 'G3', 'G4', 'PO']

/** Origen de cada cambio del historial de categoría genética. */
export type GeneticCategoryChangeKind = 'EXPECTED_AT_BIRTH' | 'CONFIRMED' | 'MANUAL'

export const GENETIC_CATEGORY_CHANGE_LABELS: Record<GeneticCategoryChangeKind, string> = {
  EXPECTED_AT_BIRTH: 'Esperada al nacer',
  CONFIRMED: 'Confirmada por ABSID',
  MANUAL: 'Editada a mano',
}

/** Códigos de negocio que devuelve el backend en los 409. */
export const ANIMAL_ERROR_CODES = {
  DUPLICATE_IDENTIFIER: 'DUPLICATE_IDENTIFIER',
  DUPLICATE_EAR_TAG_AND_ABSID: 'DUPLICATE_EAR_TAG_AND_ABSID',
  DUPLICATE_PHOTO: 'DUPLICATE_PHOTO',
  DUPLICATE_WEIGHING_TYPE: 'DUPLICATE_WEIGHING_TYPE',
  WITHDRAWAL_PERIOD: 'WITHDRAWAL_PERIOD',
} as const

// ---------- Catálogos ----------
export interface Breed extends AuditFields {
  id: string
  species: Species
  name: string
  isActive: boolean
}

export interface AnimalColor extends AuditFields {
  id: string
  name: string
  isActive: boolean
}

export interface BreedFilters {
  species?: Species
  isActive?: boolean
}

export interface ColorFilters {
  isActive?: boolean
}

// ---------- Animales ----------
export interface ParentRef {
  id: string
  earTag: string | null
  name: string | null
  isExternal: boolean
}

export interface PrimaryPhoto {
  id: string
  thumbnailUrl: string
  urlsExpireAt: string
}

export interface AnimalSummary {
  id: string
  isExternal: boolean
  earTag: string | null
  name: string | null
  species: Species
  breed: EntityRef
  sex: Sex
  color: EntityRef | null
  geneticCategory: GeneticCategory | null
  /** false: categoría esperada (calculada al nacer), falta que ABSID la confirme. */
  geneticCategoryConfirmed: boolean
  absidRegistry: string | null
  identifierException: boolean
  birthDate: string | null
  status: AnimalStatus
  dam: ParentRef | null
  sire: ParentRef | null
  primaryPhoto: PrimaryPhoto | null
}

export interface CertificateFile {
  fileName: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

/** Período de retiro vigente: hasta `endsOn` no se puede faenar (o usar la leche). */
export interface WithdrawalInfo {
  endsOn: string
  productName: string
  appliedAt: string
}

export interface AnimalDetail extends AnimalSummary, AuditFields {
  absidCertificateCode: string | null
  certificateFile: CertificateFile | null
  externalRegistry: string | null
  identifierExceptionReason: string | null
  /** Pesos tomados del historial de pesajes (BIRTH y WEANING); no se editan en el animal. */
  birthWeightKg: number | null
  weaningDate: string | null
  weaningWeightKg: number | null
  lastWeighing: { weighedAt: string; weightKg: number } | null
  withdrawal: { meat: WithdrawalInfo | null; milk: WithdrawalInfo | null } | null
  entryOrigin: EntryOrigin | null
  entryDate: string | null
  sourceFarm: string | null
  statusDate: string | null
  statusReason: string | null
  notes: string | null
}

export interface AnimalFilters extends PaginationParams {
  search?: string
  isExternal?: boolean
  species?: Species
  sex?: Sex
  status?: AnimalStatus
  geneticCategory?: GeneticCategory
  breedId?: string
  colorId?: string
  /** Crías de este animal (como madre o padre). */
  parentId?: string
  /** Solo los casos especiales (arete o ABSID repetido). */
  identifierException?: boolean
}

/** Cuerpo de POST /animals. */
export interface CreateAnimalRequest {
  isExternal?: boolean
  earTag?: string
  name?: string
  species: Species
  breedId: string
  sex: Sex
  colorId?: string
  geneticCategory?: GeneticCategory
  absidRegistry?: string
  absidCertificateCode?: string
  externalRegistry?: string
  identifierException?: boolean
  identifierExceptionReason?: string
  damId?: string
  sireId?: string
  birthDate?: string
  entryOrigin?: EntryOrigin
  entryDate?: string
  sourceFarm?: string
  notes?: string
}

/** Cuerpo de PATCH /animals/:id: solo lo modificado; `null` vacía los anulables. */
export interface UpdateAnimalRequest {
  earTag?: string | null
  name?: string | null
  species?: Species
  breedId?: string
  sex?: Sex
  colorId?: string | null
  geneticCategory?: GeneticCategory | null
  absidRegistry?: string | null
  absidCertificateCode?: string | null
  externalRegistry?: string | null
  identifierException?: boolean
  identifierExceptionReason?: string | null
  damId?: string | null
  sireId?: string | null
  birthDate?: string | null
  entryOrigin?: EntryOrigin
  entryDate?: string | null
  sourceFarm?: string | null
  notes?: string | null
}

export interface ChangeAnimalStatusRequest {
  status: AnimalStatus
  date?: string
  reason?: string
  /** Faenar en período de retiro. Requiere health:override-withdrawal y overrideReason. */
  overrideWithdrawal?: boolean
  overrideReason?: string
}

/** PATCH /animals/:id/status devuelve el animal y avisos que no impidieron el cambio. */
export type ChangeAnimalStatusResponse = AnimalDetail & { warnings?: string[] }

// ---------- Categoría genética ----------
export interface ConfirmGeneticCategoryRequest {
  /** Si se omite, se confirma la categoría actual. */
  category?: GeneticCategory
  confirmedOn?: string
  absidCertificateCode?: string
  notes?: string
}

export interface GeneticCategoryChange {
  id: string
  fromCategory: GeneticCategory | null
  toCategory: GeneticCategory | null
  kind: GeneticCategoryChangeKind
  changedOn: string
  absidCertificateCode: string | null
  notes: string | null
  createdAt: string
  createdBy: string | null
}

export interface ConfirmGeneticCategoryResponse {
  animalId: string
  geneticCategory: GeneticCategory
  geneticCategoryConfirmed: boolean
  absidCertificateCode: string | null
  change: GeneticCategoryChange
}

/** Cuerpo del 409 DUPLICATE_IDENTIFIER / DUPLICATE_EAR_TAG_AND_ABSID. */
export interface DuplicateIdentifierBody {
  code: 'DUPLICATE_IDENTIFIER' | 'DUPLICATE_EAR_TAG_AND_ABSID'
  message: string
  fields: ('earTag' | 'absidRegistry')[]
  conflicts: {
    id: string
    earTag: string | null
    name: string | null
    absidRegistry: string | null
    isExternal: boolean
  }[]
}

// ---------- Fotos ----------
export interface AnimalPhoto {
  id: string
  animalId: string
  isPrimary: boolean
  description: string | null
  takenAt: string | null
  takenAtSource: 'USER' | 'EXIF' | null
  uploadedAt: string
  uploadedBy: { id: string; username: string; fullName: string }
  file: {
    fileName: string
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
    sizeBytes: number
    width: number
    height: number
    checksumSha256: string
  }
  url: string
  downloadUrl: string
  thumbnailUrl: string
  urlsExpireAt: string
  updatedAt: string
  updatedBy: string | null
}

export interface UpdatePhotoRequest {
  description?: string | null
  takenAt?: string | null
}

/** Límites de archivos que aplica el backend. */
export const FILE_LIMITS = {
  photoMaxBytes: 15 * 1024 * 1024,
  photoTypes: ['image/jpeg', 'image/png', 'image/webp'],
  certificateMaxBytes: 10 * 1024 * 1024,
  certificateTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
} as const

// ---------- Pesajes ----------
export type WeighingType = 'BIRTH' | 'WEANING' | 'ROUTINE' | 'SELECTION' | 'ENTRY' | 'SALE' | 'OTHER'

export const WEIGHING_TYPE_LABELS: Record<WeighingType, string> = {
  BIRTH: 'Nacimiento',
  WEANING: 'Destete',
  ROUTINE: 'Control periódico',
  SELECTION: 'Selección',
  ENTRY: 'Ingreso por compra',
  SALE: 'Venta',
  OTHER: 'Otro',
}

/** BIRTH y WEANING se registran una sola vez por animal. */
export const UNIQUE_WEIGHING_TYPES: WeighingType[] = ['BIRTH', 'WEANING']

export interface Weighing extends AuditFields {
  id: string
  animalId: string
  weighedAt: string
  weightKg: number
  type: WeighingType
  bodyConditionScore: number | null
  isEstimated: boolean
  nextWeighingAt: string | null
  notes: string | null
  /** Solo al crear o editar: avisos que no impiden guardar (baja o ganancia sospechosa). */
  warnings?: string[]
  /** Solo en el historial. */
  ageDays?: number | null
  changeKg?: number | null
  dailyGainG?: number | null
}

export interface CreateWeighingRequest {
  weighedAt: string
  weightKg: number
  type: WeighingType
  bodyConditionScore?: number
  isEstimated?: boolean
  nextWeighingAt?: string
  notes?: string
}

export interface UpdateWeighingRequest {
  weighedAt?: string
  weightKg?: number
  type?: WeighingType
  bodyConditionScore?: number | null
  isEstimated?: boolean
  nextWeighingAt?: string | null
  notes?: string | null
}

export interface BatchWeighingRequest {
  weighedAt: string
  type: WeighingType
  nextWeighingAt?: string
  notes?: string
  items: {
    animalId: string
    weightKg: number
    bodyConditionScore?: number
    isEstimated?: boolean
    notes?: string
  }[]
}

/** Errores por animal de los lotes (400 de /weighings/batch y /health-records/batch). */
export interface BatchItemError {
  animalId: string
  message: string
}

/** Límites de peso del backend (kg, hasta 2 decimales). */
export const WEIGHT_LIMITS = { min: 0.01, max: 999.99 } as const

/** Condición corporal de 1 a 5 en pasos de 0,5. */
export const BODY_CONDITION_SCORES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
