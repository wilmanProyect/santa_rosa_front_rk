import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAreas } from '@/features/areas'
import { Can } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatDateTime, initials } from '@/shared/lib/format'
import { Alert, Badge, Button, Icon, PageHeader, SelectField, Spinner } from '@/shared/ui'
import { UserFormDialog } from '../components/UserFormDialog'
import { UserStatusBadge } from '../components/UserStatusBadge'
import { useUsers } from '../hooks/useUsers'
import { USERS_ROUTES } from '../routes'
import type { UserStatus } from '../types/user.types'

const PAGE_SIZE = 20

export function UsersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [areaId, setAreaId] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const debouncedSearch = useDebouncedValue(search)

  const { data, isPending, isError, error, isFetching } = useUsers({
    search: debouncedSearch || undefined,
    status: status || undefined,
    areaId: areaId || undefined,
    page,
    limit: PAGE_SIZE,
  })
  const { data: areas } = useAreas()

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="Usuarios"
        description="Personal con acceso al sistema: datos, estado, roles y permisos."
        actions={
          <Can permissions={[PERMISSIONS.USERS_CREATE]}>
            <Button icon="plus" onClick={() => setCreating(true)}>
              Nuevo usuario
            </Button>
          </Can>
        }
      />

      <div className="toolbar">
        <div className="input-icon toolbar__search">
          <Icon name="search" />
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
        </div>
        <SelectField
          label="Estado"
          className="visually-hidden-label"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as UserStatus | '')
            setPage(1)
          }}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Dados de baja</option>
        </SelectField>
        {areas && areas.length > 0 && (
          <SelectField
            label="Área"
            className="visually-hidden-label"
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todas las áreas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </SelectField>
        )}
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
                  <th>CI</th>
                  <th>Área / cargo</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th>Último ingreso</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="table__empty">
                      <div className="empty">
                        <Icon name="users" size={28} />
                        No hay usuarios que coincidan con la búsqueda.
                      </div>
                    </td>
                  </tr>
                )}
                {data.items.map((user) => (
                  <tr
                    key={user.id}
                    className="is-clickable"
                    onClick={() => navigate(USERS_ROUTES.detail(user.id))}
                  >
                    <td>
                      <div className="person">
                        <span className="avatar">
                          {initials(user.firstName, user.paternalLastName)}
                        </span>
                        <div>
                          <Link
                            to={USERS_ROUTES.detail(user.id)}
                            className="table__primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {user.fullName}
                          </Link>
                          <div className="muted small">
                            @{user.username}
                            {user.email && ` · ${user.email}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{user.ciNumber ?? '—'}</td>
                    <td>
                      {user.area?.name ?? <span className="muted">—</span>}
                      {user.position && <div className="muted small">{user.position}</div>}
                    </td>
                    <td>
                      {user.roles.length > 0 ? (
                        <span className="row" style={{ gap: 4 }}>
                          {user.roles.map((role) => (
                            <Badge key={role.id} tone={role.isActive ? 'accent' : 'neutral'}>
                              {role.name}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        <span className="muted">Sin roles</span>
                      )}
                    </td>
                    <td>
                      <UserStatusBadge user={user} />
                    </td>
                    <td className="muted small">{formatDateTime(user.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>
              {data.total} usuario(s) · página {data.page} de {totalPages}
            </span>
            <div className="row">
              <Button
                variant="secondary"
                size="sm"
                icon="chevronLeft"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
                <Icon name="chevronRight" size={16} />
              </Button>
            </div>
          </div>
        </>
      )}

      <UserFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(user) => navigate(USERS_ROUTES.detail(user.id))}
      />
    </>
  )
}
