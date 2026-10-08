import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAreas } from '@/features/areas'
import { Can } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { Alert, Badge, Button, Icon, PageHeader, SelectField, Spinner } from '@/shared/ui'
import { usePermissionCatalog, useRoles } from '../hooks/useRoles'
import { ROLES_ROUTES } from '../routes'
import type { RoleFilters } from '../types/role.types'

export function RolesPage() {
  const navigate = useNavigate()
  const [areaId, setAreaId] = useState('')
  const [active, setActive] = useState<'' | 'true' | 'false'>('')

  const filters: RoleFilters = {
    areaId: areaId || undefined,
    isActive: active ? active === 'true' : undefined,
  }
  const { data: roles, isPending, isError, error } = useRoles(filters)
  const { data: areas } = useAreas()
  const { data: catalog } = usePermissionCatalog()
  const totalPermissions = catalog?.length

  return (
    <>
      <PageHeader
        eyebrow="Seguridad"
        title="Roles y permisos"
        description="Cada rol agrupa los permisos que reciben los usuarios que lo tienen. Los cambios rigen de inmediato."
        actions={
          <Can permissions={[PERMISSIONS.ROLES_CREATE]}>
            <Button icon="plus" onClick={() => navigate(ROLES_ROUTES.create)}>
              Nuevo rol
            </Button>
          </Can>
        }
      />

      <div className="toolbar">
        <SelectField
          label="Área"
          className="visually-hidden-label"
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
        >
          <option value="">Todas las áreas</option>
          {areas?.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Estado"
          className="visually-hidden-label"
          value={active}
          onChange={(e) => setActive(e.target.value as typeof active)}
        >
          <option value="">Todos los estados</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </SelectField>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {roles && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Área</th>
                <th>Permisos</th>
                <th>Estado</th>
                <th className="table__actions">
                  <span className="visually-hidden">Abrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 && (
                <tr>
                  <td colSpan={5} className="table__empty">
                    <div className="empty">
                      <Icon name="shield" size={28} />
                      No hay roles que coincidan con los filtros.
                    </div>
                  </td>
                </tr>
              )}
              {roles.map((role) => (
                <tr
                  key={role.id}
                  className="is-clickable"
                  onClick={() => navigate(ROLES_ROUTES.detail(role.id))}
                >
                  <td>
                    <div className="row">
                      <Link
                        to={ROLES_ROUTES.detail(role.id)}
                        className="table__primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {role.name}
                      </Link>
                      {role.isSystem && <Badge tone="accent">Sistema</Badge>}
                    </div>
                    {role.description && <div className="muted small">{role.description}</div>}
                  </td>
                  <td>{role.area?.name ?? <span className="muted">General</span>}</td>
                  <td>
                    {role.isSystem ? (
                      <Badge tone="info">Todos</Badge>
                    ) : (
                      <span>
                        <strong>{role.permissions.length}</strong>
                        {totalPermissions !== undefined && (
                          <span className="muted"> de {totalPermissions}</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td>
                    {role.isActive ? (
                      <Badge tone="success">Activo</Badge>
                    ) : (
                      <Badge tone="danger">Inactivo</Badge>
                    )}
                  </td>
                  <td className="table__actions">
                    <Icon name="chevronRight" className="muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
