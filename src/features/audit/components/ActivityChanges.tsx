import { Link } from 'react-router'
import { Badge, Icon } from '@/shared/ui'
import { fieldLabel, formatAuditValue } from '../lib/audit-format'
import { AUDIT_ROUTES } from '../routes'
import {
  AUDIT_ACTION_LABELS,
  type AuditAction,
  type AuditEntry,
  type AuditRef,
} from '../types/audit.types'

const ACTION_TONE: Record<AuditAction, 'success' | 'info' | 'danger' | 'accent' | 'neutral'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  RESTORE: 'accent',
  EVENT: 'neutral',
}

export function ActionBadge({ entry }: { entry: AuditEntry }) {
  return (
    <Badge tone={ACTION_TONE[entry.action]}>
      {entry.action === 'EVENT' ? (entry.eventLabel ?? 'Acción') : AUDIT_ACTION_LABELS[entry.action]}
    </Badge>
  )
}

/** Registro afectado: su nombre si está en `refs`. */
export function recordLabel(entry: AuditEntry, refs: Record<string, AuditRef>): string | null {
  if (!entry.recordId) return null
  return refs[entry.recordId]?.label ?? null
}

/** Una línea corta para la tabla: qué campos cambiaron o el resumen del evento. */
export function entrySummary(entry: AuditEntry): string {
  if (entry.summary) return entry.summary
  const fields = Object.keys(entry.changes ?? {})
  if (entry.action === 'UPDATE' && fields.length > 0) {
    const names = fields.slice(0, 3).map(fieldLabel).join(', ')
    return fields.length > 3 ? `${names} y ${fields.length - 3} más` : names
  }
  return ''
}

interface ActivityChangesProps {
  entry: AuditEntry
  refs: Record<string, AuditRef>
  /** Oculta el enlace a la operación completa (cuando ya se está viendo). */
  hideOperationLink?: boolean
}

/** Detalle de un cambio: antes y después, los datos ingresados o los del registro borrado. */
export function ActivityChanges({ entry, refs, hideOperationLink }: ActivityChangesProps) {
  const changes = entry.changes ?? {}
  const fields = Object.keys(changes)
  const value = (v: unknown, field: string) => formatAuditValue(v, field, entry.entity, refs)

  return (
    <div className="activity-detail">
      {entry.action === 'EVENT' && entry.summary && <p className="m-0">{entry.summary}</p>}

      {entry.action === 'DELETE' && fields.length === 0 && (
        <p className="m-0 muted">Eliminó el registro (se puede recuperar: es un borrado lógico).</p>
      )}

      {fields.length > 0 &&
        (entry.action === 'UPDATE' ? (
          <table className="activity-detail__table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Antes</th>
                <th>Después</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const pair = changes[field]
                const [before, after] = Array.isArray(pair) && pair.length === 2 ? pair : [undefined, pair]
                return (
                  <tr key={field}>
                    <th scope="row">{fieldLabel(field)}</th>
                    <td className="activity-detail__before">{value(before, field)}</td>
                    <td className="activity-detail__after">{value(after, field)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="activity-detail__table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>{entry.action === 'DELETE' ? 'Valor que tenía' : 'Valor'}</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field}>
                  <th scope="row">{fieldLabel(field)}</th>
                  <td>{value(changes[field], field)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}

      <div className="activity-detail__meta muted small">
        {entry.ip && <span>IP {entry.ip}</span>}
        {entry.actorUsername && <span>@{entry.actorUsername}</span>}
        {entry.requestId && !hideOperationLink && (
          <Link to={AUDIT_ROUTES.operation(entry.requestId)} className="activity-detail__link">
            <Icon name="activity" size={14} /> Ver la operación completa
          </Link>
        )}
      </div>
    </div>
  )
}
