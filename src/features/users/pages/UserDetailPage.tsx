import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDate, formatDateTime, initials } from '@/shared/lib/format'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Icon,
  PageHeader,
  Spinner,
  useToast,
  type IconName,
} from '@/shared/ui'
import { ChangeStatusDialog } from '../components/ChangeStatusDialog'
import { ResetPasswordDialog } from '../components/ResetPasswordDialog'
import { UserFormDialog } from '../components/UserFormDialog'
import { UserPermissionsPanel } from '../components/UserPermissionsPanel'
import { UserRolesPanel } from '../components/UserRolesPanel'
import { UserStatusBadge } from '../components/UserStatusBadge'
import { useDeleteUser, useUser } from '../hooks/useUsers'
import { USERS_ROUTES } from '../routes'
import { INACTIVE_REASON_LABELS, type UserDetail } from '../types/user.types'

type Tab = 'info' | 'roles' | 'permisos'
type OpenDialog = 'edit' | 'status' | 'password' | 'delete' | null

export function UserDetailPage() {
  const { userId } = useParams()
  const { data: user, isPending, isError, error } = useUser(userId)

  if (isError) {
    return (
      <>
        <BackLink />
        <Alert tone="error">{getErrorMessage(error)}</Alert>
      </>
    )
  }
  if (isPending) return <Spinner />
  return <UserDetailView user={user} />
}

function BackLink() {
  return (
    <Link to={USERS_ROUTES.list}>
      <Icon name="arrowLeft" size={14} /> Usuarios
    </Link>
  )
}

function UserDetailView({ user }: { user: UserDetail }) {
  const { user: sessionUser, can } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const remove = useDeleteUser()
  // La pestaña vive en la URL (?tab=roles) para poder enlazarla y volver con el navegador.
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [dialog, setDialog] = useState<OpenDialog>(null)

  const isSelf = user.id === sessionUser?.id
  const canSeeRoles = can(PERMISSIONS.ROLES_READ)
  const [now] = useState(() => Date.now())
  const locked = user.lockedUntil !== null && Date.parse(user.lockedUntil) > now

  const tabs: { id: Tab; label: string; icon: IconName; visible: boolean }[] = [
    { id: 'info', label: 'Información', icon: 'users', visible: true },
    { id: 'roles', label: 'Roles', icon: 'shield', visible: canSeeRoles },
    { id: 'permisos', label: 'Permisos', icon: 'key', visible: canSeeRoles },
  ]
  const tab: Tab = tabs.find((t) => t.id === requestedTab && t.visible)?.id ?? 'info'
  const setTab = (next: Tab) =>
    setSearchParams(next === 'info' ? {} : { tab: next }, { replace: true })

  return (
    <>
      <PageHeader
        eyebrow={<BackLink />}
        title={
          <span className="person">
            <span className="avatar avatar--lg">
              {initials(user.firstName, user.paternalLastName)}
            </span>
            <span>
              {user.fullName}
              <span className="row" style={{ marginTop: 6 }}>
                <UserStatusBadge user={user} />
                {user.mustChangePassword && (
                  <Badge tone="warning">Debe cambiar contraseña</Badge>
                )}
                {locked && <Badge tone="danger">Bloqueado</Badge>}
                {isSelf && <Badge tone="info">Usted</Badge>}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {can(PERMISSIONS.USERS_UPDATE) && (
              <Button variant="secondary" icon="edit" onClick={() => setDialog('edit')}>
                Editar
              </Button>
            )}
            {can(PERMISSIONS.USERS_RESET_PASSWORD) && !isSelf && (
              <Button variant="secondary" icon="lock" onClick={() => setDialog('password')}>
                Restablecer contraseña
              </Button>
            )}
            {can(PERMISSIONS.USERS_CHANGE_STATUS) && !isSelf && (
              <Button
                variant={user.status === 'ACTIVE' ? 'secondary' : 'primary'}
                icon="power"
                onClick={() => setDialog('status')}
              >
                {user.status === 'ACTIVE' ? 'Dar de baja' : 'Reactivar'}
              </Button>
            )}
            {can(PERMISSIONS.USERS_DELETE) && !isSelf && (
              <Button
                variant="ghost"
                icon="trash"
                onClick={() => {
                  remove.reset()
                  setDialog('delete')
                }}
                aria-label="Eliminar usuario"
                title="Eliminar usuario"
              />
            )}
          </>
        }
      />

      {tabs.filter((t) => t.visible).length > 1 && (
        <div className="tabs" role="tablist">
          {tabs
            .filter((t) => t.visible)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
        </div>
      )}

      {tab === 'info' && <UserInfo user={user} locked={locked} />}
      {tab === 'roles' && <UserRolesPanel key={user.updatedAt} user={user} />}
      {tab === 'permisos' && <UserPermissionsPanel key={user.updatedAt} user={user} />}

      <UserFormDialog open={dialog === 'edit'} user={user} onClose={() => setDialog(null)} />
      <ChangeStatusDialog open={dialog === 'status'} user={user} onClose={() => setDialog(null)} />
      <ResetPasswordDialog
        open={dialog === 'password'}
        user={user}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        title="Eliminar usuario"
        message={
          <>
            ¿Eliminar a <strong>{user.fullName}</strong>? Su usuario, correo y CI quedarán libres
            para un registro nuevo. Para retiros de personal es preferible <em>darlo de baja</em>,
            que conserva el motivo.
          </>
        }
        confirmLabel="Eliminar usuario"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          remove.mutate(user.id, {
            onSuccess: () => {
              toast.show(`Usuario @${user.username} eliminado`)
              navigate(USERS_ROUTES.list, { replace: true })
            },
          })
        }
      />
    </>
  )
}

function UserInfo({ user, locked }: { user: UserDetail; locked: boolean }) {
  return (
    <div className="stack">
      {user.status === 'INACTIVE' && (
        <Alert tone="warning">
          Dado de baja el {formatDate(user.inactiveDate)}
          {user.inactiveReason && <> por {INACTIVE_REASON_LABELS[user.inactiveReason].toLowerCase()}</>}
          .{user.inactiveNotes && <> Observaciones: {user.inactiveNotes}</>}
        </Alert>
      )}
      {locked && (
        <Alert tone="error">
          Cuenta bloqueada por intentos fallidos hasta el {formatDateTime(user.lockedUntil)}. Puede
          desbloquearla restableciendo la contraseña.
        </Alert>
      )}

      <section className="card">
        <header className="card__header">
          <h2>Datos personales</h2>
        </header>
        <div className="card__body">
          <dl className="data-list">
            <Item label="Nombre(s)" value={user.firstName} />
            <Item label="Apellido paterno" value={user.paternalLastName} />
            <Item label="Apellido materno" value={user.maternalLastName} />
            <Item label="Número de CI" value={user.ciNumber} />
            <Item label="Fecha de nacimiento" value={formatDate(user.birthDate)} />
            <Item label="Teléfono" value={user.phone} />
            <Item label="Correo electrónico" value={user.email} />
          </dl>
        </div>
      </section>

      <section className="card">
        <header className="card__header">
          <h2>Trabajo y acceso</h2>
        </header>
        <div className="card__body">
          <dl className="data-list">
            <Item label="Área" value={user.area?.name} />
            <Item label="Cargo" value={user.position} />
            <Item label="Usuario" value={`@${user.username}`} />
            <Item
              label="Roles"
              value={
                user.roles.length > 0 ? (
                  <span className="row" style={{ gap: 4 }}>
                    {user.roles.map((role) => (
                      <Badge key={role.id} tone={role.isActive ? 'accent' : 'neutral'}>
                        {role.name}
                        {!role.isActive && ' (inactivo)'}
                      </Badge>
                    ))}
                  </span>
                ) : null
              }
            />
            <Item label="Último ingreso" value={formatDateTime(user.lastLoginAt)} />
            <Item label="Contraseña cambiada" value={formatDateTime(user.passwordChangedAt)} />
            <Item label="Creado" value={formatDateTime(user.createdAt)} />
            <Item label="Última modificación" value={formatDateTime(user.updatedAt)} />
          </dl>
        </div>
      </section>
    </div>
  )
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === null || value === undefined || value === ''
  return (
    <div>
      <dt>{label}</dt>
      <dd>{empty ? <span className="muted">—</span> : value}</dd>
    </div>
  )
}
