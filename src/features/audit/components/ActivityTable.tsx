import { Fragment, useState } from 'react'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { addDaysIso, formatDateTime, todayIso } from '@/shared/lib/format'
import { Alert, Button, Icon, Pagination, SelectField, Spinner } from '@/shared/ui'
import { useAuditEntities, useActivity } from '../hooks/useActivity'
import { useAuditUserOptions } from '../hooks/useLoginHistory'
import { actorName } from '../lib/audit-format'
import { AUDIT_ACTION_LABELS, type AuditAction } from '../types/audit.types'
import { ActionBadge, ActivityChanges, entrySummary, recordLabel } from './ActivityChanges'
import './audit.css'

const PAGE_SIZE = 20
const ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]

interface ActivityTableProps {
  /** Fija el registro a un usuario (pestaña "Actividad" de su ficha) y oculta ese filtro. */
  userId?: string
  /** Solo los cambios de una operación ("Ver la operación completa"). Ignora los demás filtros. */
  requestId?: string
  onClearRequest?(): void
}

/** Registro de actividad: quién ingresó, modificó o borró qué dato, y cuándo. */
export function ActivityTable({ userId: fixedUserId, requestId, onClearRequest }: ActivityTableProps) {
  const { can } = useAuth()
  const [userId, setUserId] = useState('')
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState<AuditAction | ''>('')
  // Por defecto, los últimos 7 días (hoy incluido).
  const [from, setFrom] = useState(() => addDaysIso(todayIso(), -6))
  const [to, setTo] = useState(() => todayIso())
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)

  const showUserFilter = !fixedUserId && can(PERMISSIONS.USERS_READ)
  const { data: users } = useAuditUserOptions(showUserFilter)
  const { data: entities } = useAuditEntities()
  const { data, isPending, isError, error, isFetching } = useActivity(
    requestId
      ? { requestId, page, limit: PAGE_SIZE }
      : {
          userId: fixedUserId ?? (userId || undefined),
          entity: entity || undefined,
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: PAGE_SIZE,
        },
  )

  const filter =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPage(1)
    }

  return (
    <>
      {requestId ? (
        <Alert tone="info">
          <div className="activity-operation">
            <span>Mostrando todos los cambios guardados en una misma operación.</span>
            {onClearRequest && (
              <Button variant="secondary" size="sm" onClick={onClearRequest}>
                Ver toda la actividad
              </Button>
            )}
          </div>
        </Alert>
      ) : (
        <div className="toolbar">
          {showUserFilter && (
            <SelectField
              label="Usuario"
              className="visually-hidden-label"
              value={userId}
              onChange={(e) => filter(setUserId)(e.target.value)}
            >
              <option value="">Todos los usuarios</option>
              {users?.items.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} (@{user.username})
                </option>
              ))}
            </SelectField>
          )}
          <SelectField
            label="Tabla"
            className="visually-hidden-label"
            value={entity}
            onChange={(e) => filter(setEntity)(e.target.value)}
          >
            <option value="">Todas las tablas</option>
            {entities?.map((e) => (
              <option key={e.code} value={e.code}>
                {e.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Acción"
            className="visually-hidden-label"
            value={action}
            onChange={(e) => filter(setAction)(e.target.value as AuditAction | '')}
          >
            <option value="">Todas las acciones</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a === 'EVENT' ? 'Acciones (certificados, copias…)' : AUDIT_ACTION_LABELS[a]}
              </option>
            ))}
          </SelectField>
          <div className="toolbar__range">
            <label>
              <span>Desde</span>
              <input
                className="input"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => filter(setFrom)(e.target.value)}
              />
            </label>
            <label>
              <span>Hasta</span>
              <input
                className="input"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => filter(setTo)(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {data && (
        <>
          <div className="table-wrap" aria-busy={isFetching}>
            <table className="table activity-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  {!fixedUserId && <th>Usuario</th>}
                  <th>Acción</th>
                  <th>Tabla</th>
                  <th>Registro</th>
                  <th>Resumen</th>
                  <th aria-label="Detalle" />
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table__empty">
                      <div className="empty">
                        <Icon name="activity" size={28} />
                        No hay actividad registrada con estos filtros.
                      </div>
                    </td>
                  </tr>
                )}
                {data.items.map((entry) => {
                  const expanded = open === entry.id
                  return (
                    <Fragment key={entry.id}>
                      <tr
                        className={expanded ? 'activity-table__row is-open' : 'activity-table__row'}
                        onClick={() => setOpen(expanded ? null : entry.id)}
                      >
                        <td className="nowrap">{formatDateTime(entry.occurredAt)}</td>
                        {!fixedUserId && <td>{actorName(entry)}</td>}
                        <td>
                          <ActionBadge entry={entry} />
                        </td>
                        <td>{entry.entityLabel}</td>
                        <td className="table__primary">{recordLabel(entry, data.refs) ?? '—'}</td>
                        <td className="muted small">{entrySummary(entry)}</td>
                        <td className="nowrap">
                          <button
                            type="button"
                            className="activity-toggle"
                            aria-expanded={expanded}
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpen(expanded ? null : entry.id)
                            }}
                          >
                            {expanded ? 'Ocultar' : 'Ver detalle'}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="activity-table__detail">
                          <td colSpan={7}>
                            <ActivityChanges
                              entry={entry}
                              refs={data.refs}
                              hideOperationLink={!!requestId}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            noun="cambio(s)"
            onChange={setPage}
          />
        </>
      )}
    </>
  )
}
