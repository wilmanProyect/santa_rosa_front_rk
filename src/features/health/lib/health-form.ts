import { nullable, optional, todayIso } from '@/shared/lib/format'
import type {
  AdministrationRoute,
  DoseUnit,
  HealthEventType,
  HealthRecord,
  HealthRecordFields,
  UpdateHealthRecordRequest,
} from '../types/health.types'

/** Estado del formulario: todo como texto, tal como viene de los inputs. */
export interface HealthFormValues {
  type: HealthEventType
  appliedAt: string
  isDateEstimated: boolean
  productId: string
  productBatch: string
  doseQuantity: string
  doseUnit: DoseUnit | ''
  route: AdministrationRoute | ''
  targetCondition: string
  appliedBy: string
  location: string
  nextDoseAt: string
  cost: string
  notes: string
}

export function emptyHealthForm(type: HealthEventType = 'VACCINATION'): HealthFormValues {
  return {
    type,
    appliedAt: todayIso(),
    isDateEstimated: false,
    productId: '',
    productBatch: '',
    doseQuantity: '',
    doseUnit: '',
    route: '',
    targetCondition: '',
    appliedBy: '',
    location: '',
    nextDoseAt: '',
    cost: '',
    notes: '',
  }
}

const str = (value: string | number | null) => (value === null ? '' : String(value))

export function toHealthForm(record: HealthRecord): HealthFormValues {
  return {
    type: record.type,
    appliedAt: record.appliedAt,
    isDateEstimated: record.isDateEstimated,
    productId: record.product?.id ?? '',
    productBatch: str(record.productBatch),
    doseQuantity: str(record.doseQuantity),
    doseUnit: record.doseUnit ?? '',
    route: record.route ?? '',
    targetCondition: str(record.targetCondition),
    appliedBy: str(record.appliedBy),
    location: str(record.location),
    nextDoseAt: str(record.nextDoseAt),
    cost: str(record.cost),
    notes: str(record.notes),
  }
}

const toNumber = (value: string) => (value.trim() === '' ? undefined : Number(value))

/** Valida lo que conviene avisar antes de enviar. */
export function validateHealthForm(v: HealthFormValues): string | null {
  if (v.doseQuantity && !v.doseUnit && !v.productId) {
    return 'Indique la unidad de la dosis.'
  }
  if (v.nextDoseAt && v.nextDoseAt <= v.appliedAt) {
    return 'La próxima dosis debe ser posterior a la fecha de aplicación.'
  }
  return null
}

/** Campos comunes para el alta (individual o masiva): se omiten los vacíos. */
export function buildHealthFields(v: HealthFormValues): HealthRecordFields {
  return {
    type: v.type,
    appliedAt: v.appliedAt,
    isDateEstimated: v.isDateEstimated || undefined,
    productId: optional(v.productId),
    productBatch: optional(v.productBatch),
    doseQuantity: toNumber(v.doseQuantity),
    // Sin unidad, el backend usa la del producto.
    doseUnit: v.doseQuantity ? v.doseUnit || undefined : undefined,
    route: v.route || undefined,
    targetCondition: optional(v.targetCondition),
    appliedBy: optional(v.appliedBy),
    location: optional(v.location),
    nextDoseAt: optional(v.nextDoseAt),
    cost: toNumber(v.cost),
    notes: optional(v.notes),
  }
}

/** PATCH con solo lo modificado; `null` vacía los opcionales (`productId: null` quita el producto). */
export function buildHealthUpdate(initial: HealthFormValues, v: HealthFormValues): UpdateHealthRecordRequest {
  const body: UpdateHealthRecordRequest = {}
  const changed = (key: keyof HealthFormValues) => initial[key] !== v[key]

  if (changed('type')) body.type = v.type
  if (changed('appliedAt')) body.appliedAt = v.appliedAt
  if (changed('isDateEstimated')) body.isDateEstimated = v.isDateEstimated
  if (changed('productId')) body.productId = v.productId || null
  for (const key of ['productBatch', 'targetCondition', 'appliedBy', 'location', 'nextDoseAt', 'notes'] as const) {
    if (changed(key)) body[key] = nullable(v[key])
  }
  if (changed('doseQuantity')) body.doseQuantity = v.doseQuantity === '' ? null : Number(v.doseQuantity)
  if (changed('doseUnit')) body.doseUnit = v.doseUnit || null
  if (changed('route')) body.route = v.route || null
  if (changed('cost')) body.cost = v.cost === '' ? null : Number(v.cost)
  return body
}
