import type { Sex, Species } from '@/features/animals'
import { PERMISSIONS, type PermissionCode } from '@/shared/config/permissions'
import type { PaginationParams } from '@/shared/types/api.types'

export type ControlType = 'WEANING' | 'WEIGHING' | 'HEALTH'
export type ControlState = 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'LATER'
/** Filtro de la lista: `PENDING` = atrasados + hoy + próximos. */
export type ControlStateFilter = 'PENDING' | ControlState

export const CONTROL_TYPES: ControlType[] = ['WEANING', 'WEIGHING', 'HEALTH']

export const CONTROL_LABELS: Record<ControlType, string> = {
  WEANING: 'Destete',
  WEIGHING: 'Control de peso',
  HEALTH: 'Control sanitario',
}

export const CONTROL_STATE_LABELS: Record<ControlState, string> = {
  OVERDUE: 'Atrasado',
  TODAY: 'Hoy',
  UPCOMING: 'Próximo',
  LATER: 'Más adelante',
}

export const CONTROL_STATE_FILTER_LABELS: Record<ControlStateFilter, string> = {
  PENDING: 'Pendientes',
  OVERDUE: 'Atrasados',
  TODAY: 'Hoy',
  UPCOMING: 'Próximos',
  LATER: 'Más adelante',
}

/** Permiso para ver y justificar cada control. */
export const CONTROL_PERMISSION: Record<ControlType, PermissionCode> = {
  WEANING: PERMISSIONS.WEIGHINGS_WRITE,
  WEIGHING: PERMISSIONS.WEIGHINGS_WRITE,
  HEALTH: PERMISSIONS.HEALTH_WRITE,
}

/** Motivos sugeridos (editables) en el diálogo "Justificar". */
export const JUSTIFICATION_SUGGESTIONS: Record<ControlType, string[]> = {
  WEANING: [
    'Cría débil, se desteta cuando gane peso',
    'Destetado antes de usar el sistema',
    'La madre murió: crianza artificial',
  ],
  WEIGHING: ['Balanza en reparación', 'Animal en otro potrero'],
  HEALTH: ['Sin veterinario disponible', 'Producto agotado'],
}

/** Máximo de animales por justificación (igual que la API). */
export const MAX_JUSTIFY_BATCH = 500

export interface ControlItem {
  animalId: string
  earTag: string | null
  name: string | null
  species: Species
  sex: Sex
  birthDate: string | null
  /** Último pesaje o registro sanitario (null en el destete). */
  lastDate: string | null
  baseDueDate: string
  /** Vencimiento vigente (el reprogramado si hay justificación). */
  dueDate: string
  state: ControlState
  daysOverdue: number
  justification: {
    reason: string
    nextDueDate: string | null
    createdAt: string
    createdBy: string | null
  } | null
}

export interface ControlsPage {
  /** Fecha de la cabaña. */
  today: string
  items: ControlItem[]
  total: number
  page: number
  limit: number
}

export interface ControlFilters extends PaginationParams {
  type: ControlType
  state?: ControlStateFilter
  search?: string
}

export interface ControlCounts {
  overdue: number
  today: number
  upcoming: number
  enteringUpcoming: number
  newlyOverdue: number
}

export interface ControlsSummary {
  today: string
  /** Solo los controles que el usuario puede ver. */
  controls: Partial<Record<ControlType, ControlCounts>>
}

export interface JustifyControlsRequest {
  type: ControlType
  animalIds: string[]
  reason: string
  /** Obligatoria en peso y sanidad. En el destete, sin fecha se cierra. */
  nextDueDate?: string
}

export interface JustifyControlsResponse {
  justified: number
  items: ControlItem[]
}

export interface ControlJustification {
  id: string
  animalId: string
  type: ControlType
  resolvedDueDate: string
  /** null = destete cerrado. */
  nextDueDate: string | null
  reason: string
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export interface ControlJustificationFilters {
  animalId?: string
  type?: ControlType
}
