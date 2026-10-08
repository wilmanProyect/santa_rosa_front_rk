import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { useRoles } from '@/features/roles'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { Alert, Badge, Button, Spinner, useToast } from '@/shared/ui'
import { useAssignUserRoles } from '../hooks/useUsers'
import type { UserDetail } from '../types/user.types'

/** Asignación de roles: reemplaza la lista completa con PUT /users/:id/roles. */
export function UserRolesPanel({ user }: { user: UserDetail }) {
  const { can } = useAuth()
  const toast = useToast()
  const { data: roles, isPending, isError, error } = useRoles()
  const mutation = useAssignUserRoles()

  const initial = new Set(user.roles.map((r) => r.id))
  const [selected, setSelected] = useState(initial)
  const canAssign = can(PERMISSIONS.USERS_ASSIGN_ROLES)
  const dirty =
    selected.size !== initial.size || [...selected].some((id) => !initial.has(id))

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function save() {
    mutation.mutate(
      { id: user.id, roleIds: [...selected] },
      { onSuccess: () => toast.show('Roles actualizados. Los permisos ya rigen.') },
    )
  }

  // Primero los del área del usuario, luego generales y al final los de otras áreas.
  const rank = (areaId: string | undefined) =>
    areaId === undefined ? 1 : areaId === user.area?.id ? 0 : 2
  const sorted = roles && [...roles].sort((a, b) => rank(a.area?.id) - rank(b.area?.id))

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Roles</h2>
          <p>Los permisos del usuario se heredan de sus roles activos.</p>
        </div>
        {canAssign && (
          <Button icon="check" onClick={save} disabled={!dirty} loading={mutation.isPending}>
            Guardar roles
          </Button>
        )}
      </header>
      <div className="card__body stack">
        {mutation.isError && <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>}
        {isPending && <Spinner />}
        {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
        {sorted && sorted.length === 0 && <p className="muted m-0">No hay roles creados.</p>}
        {sorted && (
          <div className="choice-grid">
            {sorted.map((role) => {
              const checked = selected.has(role.id)
              return (
                <label
                  key={role.id}
                  className={`checkbox choice${checked ? ' is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    // Un rol inactivo se puede quitar, pero no asignar.
                    disabled={!canAssign || (!role.isActive && !checked)}
                    onChange={(e) => toggle(role.id, e.target.checked)}
                  />
                  <span className="stack stack--sm" style={{ gap: 2 }}>
                    <span className="row" style={{ gap: 6 }}>
                      <strong>{role.name}</strong>
                      {role.isSystem && <Badge tone="accent">Sistema</Badge>}
                      {!role.isActive && <Badge tone="danger">Inactivo</Badge>}
                    </span>
                    <span className="muted small">
                      {role.area?.name ?? 'General'} ·{' '}
                      {role.isSystem ? 'todos los permisos' : `${role.permissions.length} permisos`}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
