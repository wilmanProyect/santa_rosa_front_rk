import { formatBs, formatDate, formatDateTime } from '@/shared/lib/format'
import type { AuditRef } from '../types/audit.types'

/**
 * Nombres de los campos tal como vienen de la base (`snake_case`), con su etiqueta de los
 * formularios. Los que falten se muestran con `_` reemplazado por espacios.
 */
const FIELD_LABELS: Record<string, string> = {
  // Generales
  name: 'Nombre',
  code: 'Código',
  description: 'Descripción',
  notes: 'Observaciones',
  status: 'Estado',
  type: 'Tipo',
  category: 'Categoría',
  is_active: 'Activo',
  is_system: 'Del sistema',
  reason: 'Motivo',
  // Animales
  ear_tag: 'Arete',
  sex: 'Sexo',
  species: 'Especie',
  breed_id: 'Raza',
  color_id: 'Color',
  area_id: 'Área',
  birth_date: 'Fecha de nacimiento',
  birth_weight_kg: 'Peso al nacer (kg)',
  dam_id: 'Madre',
  sire_id: 'Padre',
  is_external: 'Reproductor externo',
  absid_registry: 'Registro ABSID',
  absid_certificate_code: 'Código del certificado ABSID',
  external_registry: 'Registro externo ABSID',
  source_farm: 'Cabaña de procedencia',
  entry_origin: 'Origen',
  entry_date: 'Fecha de ingreso',
  genetic_category: 'Categoría genética',
  genetic_category_confirmed: 'Categoría confirmada',
  status_date: 'Fecha del estado',
  status_reason: 'Motivo del estado',
  identifier_exception: 'Caso especial',
  identifier_exception_reason: 'Motivo del caso especial',
  certificate_file_name: 'Archivo del certificado',
  certificate_file_uploaded_at: 'Certificado subido el',
  is_historical: 'Histórico',
  price: 'Precio (Bs)',
  // Fotos
  animal_id: 'Animal',
  is_primary: 'Foto principal',
  taken_at: 'Fecha de la foto',
  original_file_name: 'Archivo',
  // Pesajes
  weighed_at: 'Fecha del pesaje',
  weight_kg: 'Peso (kg)',
  body_condition_score: 'Condición corporal',
  is_estimated: 'Peso estimado',
  next_weighing_at: 'Próximo pesaje',
  // Sanidad
  applied_at: 'Fecha de aplicación',
  applied_by: 'Aplicado por',
  is_date_estimated: 'Fecha aproximada',
  product_id: 'Producto',
  product_batch: 'Lote del producto',
  dose_quantity: 'Dosis',
  dose_unit: 'Unidad de la dosis',
  route: 'Vía',
  target_condition: 'Motivo / enfermedad',
  next_dose_at: 'Próxima dosis',
  // Categoría genética
  from_category: 'Categoría anterior',
  to_category: 'Categoría nueva',
  changed_on: 'Fecha del cambio',
  kind: 'Tipo de cambio',
  certificate_number: 'N.º de certificado',
  // Controles
  control_type: 'Control',
  // Reproducción
  service_id: 'Monta',
  service_date: 'Fecha de la monta',
  exit_date: 'Fecha de salida',
  straw_code: 'Código de la pajuela',
  expected_birth_date: 'Parto probable',
  expected_offspring_category: 'Categoría esperada de las crías',
  inbreeding_coefficient: 'Consanguinidad',
  kinship_override_reason: 'Motivo para aceptar el parentesco',
  kinship_override_at: 'Parentesco aceptado el',
  kinship_override_by: 'Parentesco aceptado por',
  abortion_date: 'Fecha del aborto',
  abortion_cause: 'Causa del aborto',
  dam_death_date: 'Fecha de muerte de la madre',
  dam_death_cause: 'Causa de muerte de la madre',
  dam_death_confirmed_pregnancy: 'Preñez confirmada',
  dam_death_lost_fetuses: 'Fetos perdidos',
  checked_at: 'Fecha del diagnóstico',
  method: 'Método',
  result: 'Resultado',
  fetus_count: 'Cantidad de fetos',
  birth_id: 'Parto',
  assistance: 'Asistencia',
  litter_type: 'Tipo de parto',
  born_alive: 'Nació vivo',
  offspring_id: 'Cría',
  // Catálogos y productos
  active_ingredient: 'Principio activo',
  default_route: 'Vía habitual',
  dosage_instructions: 'Indicaciones de dosis',
  meat_withdrawal_days: 'Retiro de carne (días)',
  milk_withdrawal_days: 'Retiro de leche (días)',
  requires_prescription: 'Requiere receta',
  requires_refrigeration: 'Requiere refrigeración',
  for_sheep: 'Para ovinos',
  for_goats: 'Para caprinos',
  // Usuarios, roles y permisos
  username: 'Usuario',
  email: 'Correo',
  first_name: 'Nombres',
  paternal_last_name: 'Apellido paterno',
  maternal_last_name: 'Apellido materno',
  ci_number: 'Carné de identidad',
  phone: 'Teléfono',
  password_hash: 'Contraseña',
  must_change_password: 'Debe cambiar la contraseña',
  inactive_date: 'Fecha de baja',
  inactive_reason: 'Motivo de la baja',
  inactive_notes: 'Notas de la baja',
  user_id: 'Usuario',
  role_id: 'Rol',
  permission_id: 'Permiso',
  effect: 'Efecto',
  // Revisión de datos
  review_id: 'Aviso',
  entity_type: 'Tipo de registro',
  entity_id: 'Registro',
  resolved_at: 'Corregido el',
  resolved_by: 'Corregido por',
  resolution: 'Qué se hizo',
}

export function fieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  const text = field.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const SEX = { MALE: 'Macho', FEMALE: 'Hembra' }
const GENETIC_CATEGORY = {
  COMMERCIAL: 'Comercial / General',
  BASE: 'Base',
  G1: 'Grado 1 (G1)',
  G2: 'Grado 2 (G2)',
  G3: 'Grado 3 (G3)',
  G4: 'Grado 4 (G4)',
  PO: 'Puro de origen (PO)',
}
const ROUTE = {
  ORAL: 'Oral',
  SUBCUTANEOUS: 'Subcutánea',
  INTRAMUSCULAR: 'Intramuscular',
  INTRAVENOUS: 'Intravenosa',
  TOPICAL: 'Tópica',
  INTRANASAL: 'Intranasal',
  POUR_ON: 'Pour-on',
  IMMERSION: 'Baño / aspersión',
}

/**
 * Etiquetas de los valores fijos. Primero se busca `tabla.campo` (porque `type` o `status`
 * significan cosas distintas según la tabla) y después solo el campo.
 */
const VALUE_LABELS: Record<string, Record<string, string>> = {
  sex: SEX,
  species: { SHEEP: 'Ovino', GOAT: 'Caprino' },
  entry_origin: {
    BORN_ON_FARM: 'Nacido en la cabaña',
    PURCHASE: 'Compra',
    DONATION: 'Donación',
    GIFT: 'Regalo',
    INITIAL_STOCK: 'Inventario inicial',
  },
  genetic_category: GENETIC_CATEGORY,
  from_category: GENETIC_CATEGORY,
  to_category: GENETIC_CATEGORY,
  expected_offspring_category: GENETIC_CATEGORY,
  route: ROUTE,
  default_route: ROUTE,
  dose_unit: { ML: 'ml', G: 'g', MG: 'mg', TABLET: 'comprimido', DOSE: 'dosis' },
  'animals.status': {
    ALIVE: 'Vivo',
    DEAD: 'Muerto',
    SOLD: 'Vendido',
    SLAUGHTERED: 'Faenado',
    GIFTED: 'Regalado',
    EXCHANGED: 'Intercambiado',
    LOST: 'Perdido',
  },
  'animal_weighings.type': {
    BIRTH: 'Nacimiento',
    WEANING: 'Destete',
    ROUTINE: 'Control periódico',
    SELECTION: 'Selección',
    ENTRY: 'Ingreso (compra)',
    SALE: 'Venta',
    OTHER: 'Otro',
  },
  'health_records.category': {
    SANITARY: 'Sanitario',
    MANAGEMENT: 'Manejo',
    FACILITY: 'Instalaciones',
  },
  'health_records.type': {
    VACCINATION: 'Vacunación',
    INTERNAL_DEWORMING: 'Desparasitación interna',
    EXTERNAL_DEWORMING: 'Baño / desparasitación externa',
    VITAMINS_MINERALS: 'Vitaminas y minerales',
    TREATMENT: 'Tratamiento',
    DIAGNOSIS: 'Diagnóstico / examen',
    SHEARING: 'Esquila',
    HOOF_TRIMMING: 'Recorte de pezuñas',
    OTHER_PROCEDURE: 'Otro procedimiento',
    CORRAL_CLEANING: 'Limpieza de corral',
  },
  'veterinary_products.category': {
    VACCINE: 'Vacuna',
    INTERNAL_ANTIPARASITIC: 'Antiparasitario interno',
    EXTERNAL_ANTIPARASITIC: 'Antiparasitario externo',
    ANTIBIOTIC: 'Antibiótico',
    ANTI_INFLAMMATORY: 'Antiinflamatorio',
    VITAMIN_MINERAL: 'Vitaminas y minerales',
    DISINFECTANT: 'Desinfectante',
    OTHER: 'Otro',
  },
  'genetic_category_changes.kind': {
    EXPECTED_AT_BIRTH: 'Esperada al nacer',
    CONFIRMED: 'Confirmada por ABSID',
    MANUAL: 'Editada a mano',
  },
  'breeding_services.type': {
    DIRECTED: 'Monta dirigida',
    ARTIFICIAL_INSEMINATION: 'Inseminación artificial',
  },
  'breeding_services.status': {
    PENDING: 'Sin diagnóstico',
    PREGNANT: 'Preñada',
    EMPTY: 'Vacía',
    BIRTHED: 'Parió',
    ABORTED: 'Abortó',
    DAM_DIED: 'Madre muerta',
  },
  method: { ULTRASOUND: 'Ecografía', OBSERVATION: 'Observación' },
  'pregnancy_checks.result': { PREGNANT: 'Preñada', EMPTY: 'Vacía' },
  assistance: { NORMAL: 'Normal', ASSISTED: 'Asistido', CESAREAN: 'Cesárea' },
  litter_type: {
    SINGLE: 'Simple',
    TWINS: 'Gemelos',
    TRIPLETS: 'Trillizos',
    QUADRUPLETS: 'Cuatrillizos',
  },
  control_type: { WEANING: 'Destete', WEIGHING: 'Control de peso', HEALTH: 'Control sanitario' },
  'users.status': { ACTIVE: 'Activo', INACTIVE: 'De baja' },
  inactive_reason: {
    RESIGNATION: 'Renuncia',
    DISMISSAL: 'Despido',
    MEDICAL_LEAVE: 'Baja médica',
    SUSPENSION: 'Suspensión',
    OTHER: 'Otro',
  },
  'data_reviews.status': { OPEN: 'Pendiente', RESOLVED: 'Corregido' },
  'data_reviews.category': {
    PARENTAGE: 'Parentesco',
    MISSING_RECORD: 'Falta un registro',
    DATES: 'Fechas',
    IDENTIFIER: 'Identificación',
    OTHER: 'Otro',
  },
  entity_type: { ANIMAL: 'Animal', BIRTH: 'Parto', BREEDING_SERVICE: 'Monta' },
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

/** Un valor de `changes` listo para mostrar. */
export function formatAuditValue(
  value: unknown,
  field: string,
  entity: string,
  refs: Record<string, AuditRef>,
): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'number' && field === 'price') return formatBs(value)
  if (typeof value === 'number') return value.toLocaleString('es-BO', { maximumFractionDigits: 4 })
  if (Array.isArray(value)) {
    return value.length === 0
      ? '—'
      : value.map((v) => formatAuditValue(v, field, entity, refs)).join(', ')
  }
  if (typeof value === 'string') {
    if (refs[value]) return refs[value].label
    const label = (VALUE_LABELS[`${entity}.${field}`] ?? VALUE_LABELS[field])?.[value]
    if (label) return label
    if (DATE_ONLY.test(value)) return formatDate(value)
    if (DATE_TIME.test(value)) return formatDateTime(value)
    // "[oculto]" (la contraseña) se muestra tal cual.
    return value
  }
  return JSON.stringify(value)
}

/** Nombre de quien hizo el cambio. */
export function actorName(entry: {
  source: string
  actorFullName: string | null
  actorUsername: string | null
}): string {
  if (entry.source === 'SYSTEM') return 'Sistema'
  return entry.actorFullName || entry.actorUsername || 'Sin sesión'
}
