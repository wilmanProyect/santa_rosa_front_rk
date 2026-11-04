import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDateTime } from '@/shared/lib/format'
import { Alert, Badge, Icon, Pagination, SelectField, Spinner } from '@/shared/ui'
import { useAuditUserOptions, useLoginHistory } from '../hooks/useLoginHistory'
import { LOGIN_FAILURE_LABELS } from '../types/audit.types'

const PAGE_SIZE = 20

interface LoginHistoryTableProps {
  /** Fija el historial a un usuario (pestaña "Accesos" de su ficha) y oculta ese filtro. */
  userId?: string
}

/** Intentos de inicio de sesión, del más reciente al más antiguo. */
export function LoginHistoryTable({ userId: fixedUserId }: LoginHistoryTableProps) {
  const { can } = useAuth()
  const [userId, setUserId] = useState('')
  const [result, setResult] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)

  const showUserFilter = !fixedUserId && can(PERMISSIONS.USERS_READ)
  const { data: users } = useAuditUserOptions(showUserFilter)
  const { data, isPending, isError, error, isFetching } = useLoginHistory({
    userId: fixedUserId ?? (userId || undefined),
    success: result ? result === 'true' : undefined,
    page,
    limit: PAGE_SIZE,
  })

  return (
    <>
      <div className="toolbar">
        {showUserFilter && (
          <SelectField
            label="Usuario"
            className="visually-hidden-label"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value)
              setPage(1)
            }}
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
          label="Resultado"
          className="visually-hidden-label"
          value={result}
          onChange={(e) => {
            setResult(e.target.value as typeof result)
            setPage(1)
          }}
        >
          <option value="">Todos los resultados</option>
          <option value="true">Exitosos</option>
          <option value="false">Fallidos</option>
        </SelectField>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {data && (
        <>
          <div className="table-wrap" aria-busy={isFetching}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario escrito</th>
                  <th>Resultado</th>
                  <th>Motivo</th>
                  <th>IP</th>
                  <th>Navegador</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="table__empty">
                      <div className="empty">
                        <Icon name="activity" size={28} />
                        No hay intentos de inicio de sesión registrados.
                      </div>
                    </td>
                  </tr>
                )}
                {data.items.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="nowrap">{formatDateTime(attempt.createdAt)}</td>
                    <td>
                      <span className="table__primary">{attempt.username}</span>
                      {attempt.userId === null && (
                        <div className="muted small">Usuario inexistente</div>
                      )}
                    </td>
                    <td>
                      {attempt.success ? (
                        <Badge tone="success">Exitoso</Badge>
                      ) : (
                        <Badge tone="danger">Fallido</Badge>
                      )}
                    </td>
                    <td className="muted">
                      {attempt.failureReason ? LOGIN_FAILURE_LABELS[attempt.failureReason] : '—'}
                    </td>
                    <td className="mono small">{attempt.ip ?? '—'}</td>
                    <td className="muted small truncate" title={attempt.userAgent ?? undefined}>
                      {attempt.userAgent ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            noun="intento(s)"
            onChange={setPage}
          />
        </>
      )}
    </>
  )
}
