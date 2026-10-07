import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatDateTime } from '@/shared/lib/format'
import { Alert, Button, PageHeader, Spinner } from '@/shared/ui'
import { UserStatusBadge } from '../components/UserStatusBadge'
import { useUsers } from '../hooks/useUsers'
import type { UserStatus } from '../types/user.types'

const PAGE_SIZE = 20

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  const { data, isPending, isError, error, isFetching } = useUsers({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <>
      <PageHeader title="Usuarios" description="Personal con acceso al sistema." />

      <div className="toolbar">
        <input
          id="users-search"
          className="input"
          type="search"
          placeholder="Buscar por nombre, usuario, CI o correo"
          aria-label="Buscar usuarios"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <select
          id="users-status"
          className="input"
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as UserStatus | '')
            setPage(1)
          }}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {data && (
        <>
          <div className="table-wrap" aria-busy={isFetching}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>CI</th>
                  <th>Área / cargo</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th>Última conexión</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table__empty">
                      No hay usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
                {data.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.fullName}
                      {user.email && <div className="muted">{user.email}</div>}
                    </td>
                    <td>{user.username}</td>
                    <td>{user.ciNumber ?? '—'}</td>
                    <td>
                      {user.area?.name ?? '—'}
                      {user.position && <div className="muted">{user.position}</div>}
                    </td>
                    <td>{user.roles.map((r) => r.name).join(', ') || '—'}</td>
                    <td>
                      <UserStatusBadge user={user} />
                    </td>
                    <td>{formatDateTime(user.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>
              {data.total} usuario(s) · página {data.page} de {totalPages}
            </span>
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
    </>
  )
}
