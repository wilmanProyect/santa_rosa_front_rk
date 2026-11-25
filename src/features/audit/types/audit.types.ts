import type { Paginated, PaginationParams } from '@/shared/types/api.types'

export type LoginFailureReason = 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'USER_INACTIVE'

export const LOGIN_FAILURE_LABELS: Record<LoginFailureReason, string> = {
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos',
  ACCOUNT_LOCKED: 'Cuenta bloqueada',
  USER_INACTIVE: 'Usuario dado de baja',
}

/** Un intento de inicio de sesión (GET /auth/login-history). */
export interface LoginAttempt {
  id: string
  /** null si el usuario escrito no existe. */
  userId: string | null
  username: string
  success: boolean
  failureReason: LoginFailureReason | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export interface LoginHistoryFilters extends PaginationParams {
  userId?: string
  success?: boolean
}

// ---------- Registro de actividad (GET /audit/activity) ----------

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'EVENT'
export type AuditEventType =
  | 'CERTIFICATE_ISSUED'
  | 'BACKUP_DOWNLOADED'
  | 'BACKUP_RESTORED'
  | 'ANIMALS_IMPORTED'
  | 'DATA_EXPORTED'
export type AuditSource = 'API' | 'SYSTEM'

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Creó',
  UPDATE: 'Modificó',
  DELETE: 'Eliminó',
  RESTORE: 'Recuperó',
  EVENT: 'Acción',
}

/** Un cambio de datos o una acción registrada. */
export interface AuditEntry {
  id: string
  occurredAt: string
  actorId: string | null
  actorUsername: string | null
  actorFullName: string | null
  requestId: string | null
  ip: string | null
  source: AuditSource
  action: AuditAction
  entity: string
  entityLabel: string
  recordId: string | null
  animalIds: string[]
  /** CREATE/DELETE: { campo: valor } · UPDATE: { campo: [anterior, nuevo] } · EVENT: detalles */
  changes: Record<string, unknown> | null
  event: AuditEventType | null
  eventLabel: string | null
  summary: string | null
}

export interface AuditRef {
  type: 'animal' | 'breed' | 'color' | 'area' | 'product' | 'role' | 'permission' | 'user'
  label: string
}

export interface AuditPage extends Paginated<AuditEntry> {
  /** Nombre de cada id que aparece en la página. */
  refs: Record<string, AuditRef>
}

export interface AuditEntity {
  code: string
  label: string
}

export interface AnimalActivityFilters extends PaginationParams {
  action?: AuditAction
  /** YYYY-MM-DD, incluido. */
  from?: string
  /** YYYY-MM-DD, incluido. */
  to?: string
}

export interface ActivityFilters extends AnimalActivityFilters {
  userId?: string
  entity?: string
  recordId?: string
  animalId?: string
  event?: AuditEventType
  source?: AuditSource
  requestId?: string
}
