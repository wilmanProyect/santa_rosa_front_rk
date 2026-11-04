import { nullable, optional } from '@/shared/lib/format'
import type {
  AnimalDetail,
  CreateAnimalRequest,
  EntryOrigin,
  GeneticCategory,
  ParentRef,
  Sex,
  Species,
  UpdateAnimalRequest,
} from '../types/animal.types'

/** Estado del formulario: todo como texto, tal como viene de los inputs. */
export interface AnimalFormValues {
  earTag: string
  name: string
  species: Species | ''
  breedId: string
  sex: Sex | ''
  colorId: string
  geneticCategory: GeneticCategory | ''
  absidRegistry: string
  absidCertificateCode: string
  externalRegistry: string
  dam: ParentRef | null
  sire: ParentRef | null
  birthDate: string
  entryOrigin: EntryOrigin
  entryDate: string
  sourceFarm: string
  notes: string
  identifierException: boolean
  identifierExceptionReason: string
}

export const EMPTY_ANIMAL_FORM: AnimalFormValues = {
  earTag: '',
  name: '',
  species: '',
  breedId: '',
  sex: '',
  colorId: '',
  geneticCategory: '',
  absidRegistry: '',
  absidCertificateCode: '',
  externalRegistry: '',
  dam: null,
  sire: null,
  birthDate: '',
  entryOrigin: 'BORN_ON_FARM',
  entryDate: '',
  sourceFarm: '',
  notes: '',
  identifierException: false,
  identifierExceptionReason: '',
}

export function toFormValues(animal: AnimalDetail): AnimalFormValues {
  return {
    earTag: animal.earTag ?? '',
    name: animal.name ?? '',
    species: animal.species,
    breedId: animal.breed.id,
    sex: animal.sex,
    colorId: animal.color?.id ?? '',
    geneticCategory: animal.geneticCategory ?? '',
    absidRegistry: animal.absidRegistry ?? '',
    absidCertificateCode: animal.absidCertificateCode ?? '',
    externalRegistry: animal.externalRegistry ?? '',
    dam: animal.dam,
    sire: animal.sire,
    birthDate: animal.birthDate ?? '',
    entryOrigin: animal.entryOrigin ?? 'BORN_ON_FARM',
    entryDate: animal.entryDate ?? '',
    sourceFarm: animal.sourceFarm ?? '',
    notes: animal.notes ?? '',
    identifierException: animal.identifierException,
    identifierExceptionReason: animal.identifierExceptionReason ?? '',
  }
}

/**
 * Valores que realmente aplican según el tipo y el origen: los campos ocultos se vacían
 * (p. ej. un animal nacido en la cabaña no tiene fecha de ingreso ni procedencia).
 */
export function effectiveValues(values: AnimalFormValues, isExternal: boolean): AnimalFormValues {
  const v = { ...values }
  if (isExternal || v.entryOrigin === 'BORN_ON_FARM') v.entryDate = ''
  if (!isExternal && v.entryOrigin === 'BORN_ON_FARM') v.sourceFarm = ''
  if (!v.identifierException) v.identifierExceptionReason = ''
  return v
}

/** Mensaje especial: un animal de la cabaña sin arete solo se registra como caso especial. */
export const MISSING_EAR_TAG = 'MISSING_EAR_TAG'

/**
 * Validaciones que conviene avisar antes de enviar. Devuelve el primer problema o null.
 * `MISSING_EAR_TAG` indica que falta el arete y se puede seguir como caso especial.
 */
export function validateAnimal(values: AnimalFormValues, isExternal: boolean): string | null {
  if (isExternal) {
    if (![values.earTag, values.name, values.absidRegistry, values.externalRegistry].some((v) => v.trim())) {
      return 'Un reproductor externo necesita al menos arete, nombre, registro ABSID o registro externo.'
    }
  } else {
    if (!values.earTag.trim() && !values.identifierException) return MISSING_EAR_TAG
    if (values.entryOrigin === 'BORN_ON_FARM' && !values.birthDate) {
      return 'La fecha de nacimiento es obligatoria para los animales nacidos en la cabaña.'
    }
  }
  if (values.birthDate && values.entryDate && values.entryDate < values.birthDate) {
    return 'La fecha de ingreso no puede ser anterior al nacimiento.'
  }
  if (values.identifierException && !values.identifierExceptionReason.trim()) {
    return 'Indique el motivo del caso especial.'
  }
  return null
}

export function buildCreateRequest(form: AnimalFormValues, isExternal: boolean): CreateAnimalRequest {
  const v = effectiveValues(form, isExternal)
  return {
    isExternal: isExternal || undefined,
    earTag: optional(v.earTag),
    name: optional(v.name),
    species: v.species as Species,
    breedId: v.breedId,
    sex: v.sex as Sex,
    colorId: optional(v.colorId),
    geneticCategory: v.geneticCategory || undefined,
    absidRegistry: optional(v.absidRegistry),
    absidCertificateCode: optional(v.absidCertificateCode),
    externalRegistry: optional(v.externalRegistry),
    identifierException: v.identifierException || undefined,
    identifierExceptionReason: v.identifierException ? optional(v.identifierExceptionReason) : undefined,
    damId: v.dam?.id,
    sireId: v.sire?.id,
    birthDate: optional(v.birthDate),
    // Los externos no tienen sección de ingreso (solo la procedencia).
    entryOrigin: isExternal ? undefined : v.entryOrigin,
    entryDate: optional(v.entryDate),
    sourceFarm: optional(v.sourceFarm),
    notes: optional(v.notes),
  }
}

/** PATCH con solo lo modificado; `null` para vaciar. */
export function buildUpdateRequest(
  initialForm: AnimalFormValues,
  form: AnimalFormValues,
  isExternal: boolean,
): UpdateAnimalRequest {
  const initial = effectiveValues(initialForm, isExternal)
  const v = effectiveValues(form, isExternal)
  const body: UpdateAnimalRequest = {}
  const changed = (key: keyof AnimalFormValues) =>
    typeof v[key] === 'string' ? (v[key] as string).trim() !== (initial[key] as string).trim() : v[key] !== initial[key]

  const nullableText = [
    'earTag',
    'name',
    'colorId',
    'absidRegistry',
    'absidCertificateCode',
    'externalRegistry',
    'birthDate',
    'entryDate',
    'sourceFarm',
    'notes',
    'identifierExceptionReason',
  ] as const
  for (const key of nullableText) {
    if (changed(key)) body[key] = nullable(v[key])
  }
  if (changed('species')) body.species = v.species as Species
  // Si cambia la especie, el backend exige una raza de la nueva especie.
  if (changed('breedId') || changed('species')) body.breedId = v.breedId
  if (changed('sex')) body.sex = v.sex as Sex
  if (changed('geneticCategory')) body.geneticCategory = v.geneticCategory || null
  if (!isExternal && changed('entryOrigin')) body.entryOrigin = v.entryOrigin
  if (changed('identifierException')) body.identifierException = v.identifierException
  if (v.dam?.id !== initial.dam?.id) body.damId = v.dam?.id ?? null
  if (v.sire?.id !== initial.sire?.id) body.sireId = v.sire?.id ?? null
  return body
}
