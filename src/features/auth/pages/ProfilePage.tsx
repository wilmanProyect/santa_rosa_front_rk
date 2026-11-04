import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatDate, formatDateTime, initials } from '@/shared/lib/format'
import { Alert, Badge, Button, ConfirmDialog, DataItem, PageHeader, Spinner } from '@/shared/ui'
import { authApi } from '../api/auth.api'
import { useAuth } from '../hooks/useAuth'
import { AUTH_ROUTES } from '../routes'

/** Datos del usuario de la sesión. Los datos personales los edita un administrador. */
export function ProfilePage() {
  const navigate = useNavigate()
  const { logoutAll } = useAuth()
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)
  const [closing, setClosing] = useState(false)
  const { data: me, isPending, isError, error } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authApi.profile(),
  })

  if (isError) return <Alert tone="error">{getErrorMessage(error)}</Alert>
  if (isPending) return <Spinner />

  return (
    <>
      <PageHeader
        eyebrow="Mi cuenta"
        title={
          <span className="person">
            <span className="avatar avatar--lg">
              {initials(me.firstName, me.paternalLastName)}
            </span>
            <span>
              {me.fullName}
              <span className="row muted small" style={{ marginTop: 4, fontWeight: 600 }}>
                @{me.username}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" icon="key" onClick={() => navigate(AUTH_ROUTES.changePassword)}>
              Cambiar contraseña
            </Button>
            <Button variant="secondary" icon="logout" onClick={() => setConfirmLogoutAll(true)}>
              Cerrar sesión en todos los dispositivos
            </Button>
          </>
        }
      />

      <div className="stack">
        <Alert tone="info">
          Para corregir sus datos personales, pida a un administrador que los actualice.
        </Alert>

        <section className="card">
          <header className="card__header">
            <h2>Mis datos</h2>
          </header>
          <div className="card__body">
            <dl className="data-list">
              <DataItem label="Número de CI" value={me.ciNumber} />
              <DataItem label="Fecha de nacimiento" value={me.birthDate && formatDate(me.birthDate)} />
              <DataItem label="Correo electrónico" value={me.email} />
              <DataItem label="Teléfono" value={me.phone} />
              <DataItem label="Área" value={me.area?.name} />
              <DataItem label="Cargo" value={me.position} />
            </dl>
          </div>
        </section>

        <section className="card">
          <header className="card__header">
            <h2>Acceso</h2>
          </header>
          <div className="card__body">
            <dl className="data-list">
              <DataItem
                label="Roles"
                value={
                  me.roles.length > 0 ? (
                    <span className="row" style={{ gap: 4 }}>
                      {me.roles.map((role) => (
                        <Badge key={role.id} tone={role.isActive ? 'accent' : 'neutral'}>
                          {role.name}
                        </Badge>
                      ))}
                    </span>
                  ) : null
                }
              />
              <DataItem label="Permisos efectivos" value={`${me.effectivePermissions.length}`} />
              <DataItem label="Último ingreso" value={formatDateTime(me.lastLoginAt)} />
              <DataItem label="Contraseña cambiada" value={formatDateTime(me.passwordChangedAt)} />
            </dl>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmLogoutAll}
        title="Cerrar sesión en todos los dispositivos"
        message="Se cerrarán todas sus sesiones abiertas, incluida esta. Tendrá que volver a ingresar."
        confirmLabel="Cerrar todas"
        loading={closing}
        onClose={() => setConfirmLogoutAll(false)}
        onConfirm={() => {
          setClosing(true)
          void logoutAll()
        }}
      />
    </>
  )
}
