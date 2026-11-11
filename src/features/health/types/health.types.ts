import type { PendingPregnancyCheck, UpcomingBirth } from '@/features/reproduction'
import type { AuditFields, EntityRef, PaginationParams } from '@/shared/types/api.types'

// ---------- Productos veterinarios ----------
export type ProductCategory =
  | 'VACCINE'
  | 'INTERNAL_ANTIPARASITIC'
  | 'EXTERNAL_ANTIPARASITIC'
  | 'ANTIBIOTIC'
  | 'ANTI_INFLAMMATORY'
  | 'VITAMIN_MINERAL'
  | 'DISINFECTANT'
  | 'OTHER'

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  VACCINE: 'Vacuna',
  INTERNAL_ANTIPARASITIC: 'Antiparasitario interno',
  EXTERNAL_ANTIPARASITIC: 'Antiparasitario externo',
  ANTIBIOTIC: 'Antibiótico',
  ANTI_INFLAMMATORY: 'Antiinflamatorio',
  VITAMIN_MINERAL: 'Vitaminas y minerales',
  DISINFECTANT: 'Desinfectante',
  OTHER: 'Otro',
}

export type DoseUnit = 'ML' | 'G' | 'MG' | 'TABLET' | 'DOSE'

export const DOSE_UNIT_LABELS: Record<DoseUnit, string> = {
  ML: 'ml',
  G: 'g',
  MG: 'mg',
  TABLET: 'comprimido',
  DOSE: 'dosis',
}

export type AdministrationRoute =
  | 'ORAL'
  | 'SUBCUTANEOUS'
  | 'INTRAMUSCULAR'
  | 'INTRAVENOUS'
  | 'TOPICAL'
  | 'INTRANASAL'
  | 'POUR_ON'
  | 'IMMERSION'

export const ROUTE_LABELS: Record<AdministrationRoute, string> = {
  ORAL: 'Oral',
  SUBCUTANEOUS: 'Subcutánea',
  INTRAMUSCULAR: 'Intramuscular',
  INTRAVENOUS: 'Intravenosa',
  TOPICAL: 'Tópica',
  INTRANASAL: 'Intranasal',
  POUR_ON: 'Pour-on (sobre el lomo)',
  IMMERSION: 'Inmersión (baño)',
}

export interface VeterinaryProduct extends AuditFields {
  id: string
  name: string
  category: ProductCategory
  activeIngredient: string | null
  concentration: string | null
  manufacturer: string | null
  presentation: string | null
  doseUnit: DoseUnit | null
  defaultRoute: AdministrationRoute | null
  dosageInstructions: string | null
  forSheep: boolean
  forGoats: boolean
  meatWithdrawalDays: number
  milkWithdrawalDays: number | null
  requiresPrescription: boolean
  requiresRefrigeration: boolean
  notes: string | null
  isActive: boolean
}

export interface ProductFilters {
  search?: string
  category?: ProductCategory
  isActive?: boolean
}

/** Alta: todos los opcionales sin `null`. En PATCH los textos y unidades aceptan `null`. */
export interface ProductRequest {
  name?: string
  category?: ProductCategory
  activeIngredient?: string | null
  concentration?: string | null
  manufacturer?: string | null
  presentation?: string | null
  doseUnit?: DoseUnit | null
  defaultRoute?: AdministrationRoute | null
  dosageInstructions?: string | null
  forSheep?: boolean
  forGoats?: boolean
  meatWithdrawalDays?: number
  milkWithdrawalDays?: number | null
  requiresPrescription?: boolean
  requiresRefrigeration?: boolean
  notes?: string | null
  isActive?: boolean
}

// ---------- Registro sanitario ----------
export type HealthCategory = 'SANITARY' | 'MANAGEMENT' | 'FACILITY'

export const HEALTH_CATEGORY_LABELS: Record<HealthCategory, string> = {
  SANITARY: 'Sanitario',
  MANAGEMENT: 'Manejo',
  FACILITY: 'Instalaciones',
}

export type HealthEventType =
  | 'VACCINATION'
  | 'INTERNAL_DEWORMING'
  | 'EXTERNAL_DEWORMING'
  | 'VITAMINS_MINERALS'
  | 'TREATMENT'
  | 'DIAGNOSIS'
  | 'SHEARING'
  | 'HOOF_TRIMMING'
  | 'OTHER_PROCEDURE'
  | 'CORRAL_CLEANING'

export const HEALTH_EVENT_LABELS: Record<HealthEventType, string> = {
  VACCINATION: 'Vacunación',
  INTERNAL_DEWORMING: 'Desparasitación interna',
  EXTERNAL_DEWORMING: 'Baño / desparasitación externa',
  VITAMINS_MINERALS: 'Vitaminas y minerales',
  TREATMENT: 'Tratamiento',
  DIAGNOSIS: 'Diagnóstico o examen',
  SHEARING: 'Esquila',
  HOOF_TRIMMING: 'Recorte de pezuñas',
  OTHER_PROCEDURE: 'Otro procedimiento',
  CORRAL_CLEANING: 'Limpieza de corral',
}

/** Categoría de cada tipo de evento (para agrupar los selects). */
export const HEALTH_EVENT_CATEGORY: Record<HealthEventType, HealthCategory> = {
  VACCINATION: 'SANITARY',
  INTERNAL_DEWORMING: 'SANITARY',
  EXTERNAL_DEWORMING: 'SANITARY',
  VITAMINS_MINERALS: 'SANITARY',
  TREATMENT: 'SANITARY',
  DIAGNOSIS: 'SANITARY',
  SHEARING: 'MANAGEMENT',
  HOOF_TRIMMING: 'MANAGEMENT',
  OTHER_PROCEDURE: 'MANAGEMENT',
  CORRAL_CLEANING: 'FACILITY',
}

/** Eventos generales: no llevan animal. */
export const GENERAL_EVENT_TYPES: HealthEventType[] = ['CORRAL_CLEANING']

export interface HealthRecord extends AuditFields {
  id: string
  /** null en eventos generales (instalaciones). */
  animalId: string | null
  category: HealthCategory
  type: HealthEventType
  appliedAt: string
  isDateEstimated: boolean
  product: EntityRef | null
  productBatch: string | null
  doseQuantity: number | null
  doseUnit: DoseUnit | null
  route: AdministrationRoute | null
  targetCondition: string | null
  appliedBy: string | null
  location: string | null
  meatWithdrawalDays: number | null
  /** Desde esta fecha se puede faenar. null si no hay retiro. */
  meatWithdrawalEndsOn: string | null
  milkWithdrawalEndsOn: string | null
  nextDoseAt: string | null
  cost: number | null
  notes: string | null
}

export interface HealthRecordFilters extends PaginationParams {
  animalId?: string
  general?: boolean
  type?: HealthEventType
  category?: HealthCategory
  productId?: string
  targetCondition?: string
  from?: string
  to?: string
}

/** Campos comunes del alta individual y de la aplicación masiva. */
export interface HealthRecordFields {
  type: HealthEventType
  appliedAt: string
  isDateEstimated?: boolean
  productId?: string
  productBatch?: string
  doseQuantity?: number
  doseUnit?: DoseUnit
  route?: AdministrationRoute
  targetCondition?: string
  appliedBy?: string
  location?: string
  nextDoseAt?: string
  cost?: number
  notes?: string
}

export interface CreateHealthRecordRequest extends HealthRecordFields {
  animalId?: string
}

export interface BatchHealthRecordRequest extends HealthRecordFields {
  items: { animalId: string; doseQuantity?: number; notes?: string }[]
}

/** PATCH: solo lo modificado; `null` vacía los opcionales. El animal no se cambia. */
export interface UpdateHealthRecordRequest {
  type?: HealthEventType
  appliedAt?: string
  isDateEstimated?: boolean
  productId?: string | null
  productBatch?: string | null
  doseQuantity?: number | null
  doseUnit?: DoseUnit | null
  route?: AdministrationRoute | null
  targetCondition?: string | null
  appliedBy?: string | null
  location?: string | null
  nextDoseAt?: string | null
  cost?: number | null
  notes?: string | null
}

// ---------- Recordatorios ----------
export interface WeighingReminder {
  animalId: string
  earTag: string | null
  name: string | null
  nextWeighingAt: string
  lastWeighedAt: string
  lastWeightKg: number
  overdue: boolean
}

export interface HealthDoseReminder {
  recordId: string
  animalId: string | null
  earTag: string | null
  name: string | null
  type: HealthEventType
  productName: string | null
  targetCondition: string | null
  location: string | null
  lastAppliedAt: string
  nextDoseAt: string
  overdue: boolean
}

export interface Reminders {
  weighings: WeighingReminder[]
  healthDoses: HealthDoseReminder[]
  /** Vacíos si el usuario no tiene reproduction:read. */
  pregnancyChecks: PendingPregnancyCheck[]
  upcomingBirths: UpcomingBirth[]
}
