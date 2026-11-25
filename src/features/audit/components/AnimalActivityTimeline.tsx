import { useState } from 'react'
import { Link } from 'react-router'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatDateTime } from '@/shared/lib/format'
import { Alert, Icon, Pagination, SelectField, Spinner } from '@/shared/ui'
import { useAnimalActivity } from '../hooks/useActivity'
import { actorName } from '../lib/audit-format'
import { AUDIT_ROUTES } from '../routes'
import { AUDIT_ACTION_LABELS, type AuditAction, type AuditEntry } from '../types/audit.types'
import { ActionBadge, ActivityChanges, entrySummary, recordLabel } from './ActivityChanges'
import './audit.css'

const PAGE_SIZE = 30
const ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]

/** Cambios seguidos de una misma operación (p. ej. un parto, sus crías y la monta). */
function groupByRequest(items: AuditEntry[]): AuditEntry[][] {
  const groups: AuditEntry[][] = []
  for (const entry of items) {
    const last = groups[groups.length - 1]
    if (last && entry.requestId && last[0].requestId === entry.requestId) last.push(entry)
    else groups.push([entry])
  }
  return groups
}

/** Pestaña "Historial de cambios" de la ficha del animal, como línea de tiempo. */
export function AnimalActivityTimeline({ animalId }: { animalId: string }) {
  const [action, setAction] = useState<AuditAction | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)

  const { data, isPending, isError, error, isFetching } = useAnimalActivity(animalId, {
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const filter =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPage(1)
    }

  return (
    <div className="stack">
      <p className="m-0 muted">
        Quién ingresó, modificó o borró cada dato del animal: ficha, fotos, pesajes, sanidad,
        categoría, controles, montas, partos y certificados.
      </p>

      <div className="toolbar">
        <SelectField
          label="Acción"
          className="visually-hidden-label"
          value={action}
          onChange={(e) => filter(setAction)(e.target.value as AuditAction | '')}
        >
          <option value="">Todas las acciones</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a === 'EVENT' ? 'Acciones (certificados)' : AUDIT_ACTION_LABELS[a]}
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

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {data && data.items.length === 0 && (
        <div className="empty">
          <Icon name="activity" size={28} />
          No hay cambios registrados{action || from || to ? ' con estos filtros' : ''}.
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <ol className="timeline" aria-busy={isFetching}>
            {groupByRequest(data.items).map((group) => {
              const first = group[0]
              return (
                <li key={first.id}>
                  <div className="timeline__card">
                    <header className="timeline__header">
                      <strong>{formatDateTime(first.occurredAt)}</strong>
                      <span className="muted">{actorName(first)}</span>
                      {group.length > 1 && first.requestId && (
                        <Link to={AUDIT_ROUTES.operation(first.requestId)} className="small">
                          Ver la operación completa
                        </Link>
                      )}
                    </header>
                    <ul className="timeline__changes">
                      {group.map((entry) => {
                        const expanded = open === entry.id
                        const record = recordLabel(entry, data.refs)
                        const summary = entrySummary(entry)
                        return (
                          <li key={entry.id}>
                            <div className="timeline__change">
                              <ActionBadge entry={entry} />
                              <span>
                                {entry.entityLabel}
                                {record && <strong> · {record}</strong>}
                              </span>
                              {summary && <span className="muted small">{summary}</span>}
                              <button
                                type="button"
                                className="activity-toggle"
                                aria-expanded={expanded}
                                onClick={() => setOpen(expanded ? null : entry.id)}
                              >
                                {expanded ? 'Ocultar' : 'Ver detalle'}
                              </button>
                            </div>
                            {expanded && (
                              <ActivityChanges
                                entry={entry}
                                refs={data.refs}
                                hideOperationLink={group.length > 1}
                              />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </li>
              )
            })}
          </ol>
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            noun="cambio(s)"
            onChange={setPage}
          />
        </>
      )}
    </div>
  )
}
