import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Badge, PageHeader, Spinner } from '@/shared/ui'
import { useRoles } from '../hooks/useRoles'

export function RolesPage() {
  const { data: roles, isPending, isError, error } = useRoles()

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        description="Cada rol agrupa los permisos que reciben los usuarios que lo tienen."
      />

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
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} className="table__empty">
                    Todavía no hay roles creados.
                  </td>
                </tr>
              )}
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    {role.name} {role.isSystem && <Badge>Sistema</Badge>}
                    {role.description && <div className="muted">{role.description}</div>}
                  </td>
                  <td>{role.area?.name ?? '—'}</td>
                  <td>{role.isSystem ? 'Todos' : role.permissions.length}</td>
                  <td>
                    {role.isActive ? (
                      <Badge tone="success">Activo</Badge>
                    ) : (
                      <Badge tone="danger">Inactivo</Badge>
                    )}
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
