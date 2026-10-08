import { useMemo, useState } from 'react'
import { useAuth } from '@/features/auth'
import { groupPermissionsByModule, usePermissionCatalog, useRoles } from '@/features/roles'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { Alert, Button, Icon, Spinner, useToast } from '@/shared/ui'
import { useAssignUserPermissions } from '../hooks/useUsers'
import type { UserDetail } from '../types/user.types'
import './user-permissions.css'

type Override = 'GRANT' | 'DENY'

const OPTIONS: { value: Override | null; label: string }[] = [
  { value: null, label: 'Según rol' },
  { value: 'GRANT', label: 'Otorgar' },
  { value: 'DENY', label: 'Denegar' },
]

/**
 * Ajustes individuales de permisos. Efectivo = roles activos + otorgados − denegados;
 * una denegación gana sobre lo que digan los roles.
 */
export function UserPermissionsPanel({ user }: { user: UserDetail }) {
  const { can } = useAuth()
  const toast = useToast()
  const catalog = usePermissionCatalog()
  const roles = useRoles()
  const mutation = useAssignUserPermissions()
  const canAssign = can(PERMISSIONS.USERS_ASSIGN_PERMISSIONS)

  const initial = useMemo(
    () => new Map(user.permissionOverrides.map((o) => [o.permission.id, o.effect] as const)),
    [user.permissionOverrides],
  )
  const [overrides, setOverrides] = useState<Map<string, Override>>(initial)

  // Permisos que aporta cada rol activo del usuario (el rol de sistema los tiene todos).
  const inherited = useMemo(() => {
    const ids = new Set<string>()
    const assigned = new Set(user.roles.filter((r) => r.isActive).map((r) => r.id))
    for (const role of roles.data ?? []) {
      if (!assigned.has(role.id) || !role.isActive) continue
      const perms = role.isSystem ? (catalog.data ?? []) : role.permissions
      for (const p of perms) ids.add(p.id)
    }
    return ids
  }, [roles.data, catalog.data, user.roles])

  const dirty =
    overrides.size !== initial.size ||
    [...overrides].some(([id, effect]) => initial.get(id) !== effect)

  function setOverride(id: string, value: Override | null) {
    setOverrides((current) => {
      const next = new Map(current)
      if (value) next.set(id, value)
      else next.delete(id)
      return next
    })
  }

  function save() {
    const grantedPermissionIds: string[] = []
    const deniedPermissionIds: string[] = []
    for (const [id, effect] of overrides) {
      if (effect === 'GRANT') grantedPermissionIds.push(id)
      else deniedPermissionIds.push(id)
    }
    mutation.mutate(
      { id: user.id, body: { grantedPermissionIds, deniedPermissionIds } },
      { onSuccess: () => toast.show('Permisos individuales actualizados') },
    )
  }

  const error = catalog.error ?? roles.error
  const loading = catalog.isPending || roles.isPending

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Permisos individuales</h2>
          <p>
            Ajustes que se suman o restan a lo que el usuario hereda de sus roles.{' '}
            <strong>{user.effectivePermissions.length}</strong> permisos efectivos.
          </p>
        </div>
        {canAssign && (
          <div className="row">
            <Button
              variant="ghost"
              size="sm"
              disabled={overrides.size === 0}
              onClick={() => setOverrides(new Map())}
            >
              Quitar ajustes
            </Button>
            <Button icon="check" onClick={save} disabled={!dirty} loading={mutation.isPending}>
              Guardar permisos
            </Button>
          </div>
        )}
      </header>
      <div className="card__body stack">
        {mutation.isError && <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>}
        {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}
        {loading && !error && <Spinner />}

        {catalog.data &&
          roles.data &&
          groupPermissionsByModule(catalog.data).map(({ module, permissions }) => (
            <div key={module} className="perm-table">
              <div className="perm-table__head">
                <span>{module}</span>
                <span className="perm-table__col">Por rol</span>
                <span className="perm-table__col perm-table__col--override">Ajuste</span>
                <span className="perm-table__col">Efectivo</span>
              </div>
              {permissions.map((permission) => {
                const fromRole = inherited.has(permission.id)
                const override = overrides.get(permission.id) ?? null
                const effective = override === 'DENY' ? false : fromRole || override === 'GRANT'
                return (
                  <div
                    key={permission.id}
                    className={`perm-table__row${override ? ` is-${override.toLowerCase()}` : ''}`}
                  >
                    <span>
                      {permission.description}
                      <code className="perm-code">{permission.code}</code>
                    </span>
                    <span className="perm-table__col">
                      <YesNo value={fromRole} />
                    </span>
                    <span className="perm-table__col perm-table__col--override">
                      <span
                        className="segmented"
                        role="radiogroup"
                        aria-label={`Ajuste para ${permission.description}`}
                      >
                        {OPTIONS.map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            role="radio"
                            aria-checked={override === option.value}
                            className={`segmented__option segmented__option--${(option.value ?? 'inherit').toLowerCase()}`}
                            disabled={!canAssign}
                            onClick={() => setOverride(permission.id, option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </span>
                    </span>
                    <span className="perm-table__col">
                      <YesNo value={effective} strong />
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
      </div>
    </section>
  )
}

function YesNo({ value, strong }: { value: boolean; strong?: boolean }) {
  return (
    <span className={`yes-no${value ? ' is-yes' : ''}${strong ? ' is-strong' : ''}`}>
      <Icon name={value ? 'check' : 'minus'} size={16} />
      <span className="visually-hidden">{value ? 'Sí' : 'No'}</span>
    </span>
  )
}
