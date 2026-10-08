import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAreas } from '@/features/areas'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDateTime } from '@/shared/lib/format'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Icon,
  PageHeader,
  SelectField,
  Spinner,
  TextAreaField,
  TextField,
  useToast,
} from '@/shared/ui'
import { PermissionPicker } from '../components/PermissionPicker'
import {
  useCreateRole,
  useDeleteRole,
  usePermissionCatalog,
  useRole,
  useUpdateRole,
} from '../hooks/useRoles'
import { ROLES_ROUTES } from '../routes'
import type { Permission, Role } from '../types/role.types'

/** Crear (`/roles/nuevo`) o editar (`/roles/:roleId`) un rol. */
export function RoleEditorPage() {
  const { roleId } = useParams()
  const role = useRole(roleId)
  const catalog = usePermissionCatalog()

  const error = role.error ?? catalog.error
  if (error) return <Alert tone="error">{getErrorMessage(error)}</Alert>
  if ((roleId && !role.data) || !catalog.data) return <Spinner />

  // `key` reinicia el formulario si se navega de un rol a otro.
  return <RoleEditor key={roleId ?? 'new'} role={role.data ?? null} catalog={catalog.data} />
}

function RoleEditor({ role, catalog }: { role: Role | null; catalog: Permission[] }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const { data: areas } = useAreas()

  const create = useCreateRole()
  const update = useUpdateRole()
  const remove = useDeleteRole()
  const mutation = role ? update : create

  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [areaId, setAreaId] = useState(role?.area?.id ?? '')
  const [isActive, setIsActive] = useState(role?.isActive ?? true)
  const [selected, setSelected] = useState(() => new Set(role?.permissions.map((p) => p.id)))
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isSystem = role?.isSystem ?? false
  const canSave = role ? can(PERMISSIONS.ROLES_UPDATE) : can(PERMISSIONS.ROLES_CREATE)
  const readOnly = isSystem || !canSave

  // El área actual se muestra aunque esté inactiva; las demás inactivas no se pueden elegir.
  const areaOptions = areas ?? (role?.area ? [{ ...role.area, isActive: true }] : [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const permissionIds = [...selected]
    if (role) {
      update.mutate(
        {
          id: role.id,
          body: {
            name: name.trim(),
            description: description.trim(),
            areaId: areaId || null,
            isActive,
            permissionIds,
          },
        },
        { onSuccess: () => toast.show('Rol actualizado. Los cambios ya rigen para sus usuarios.') },
      )
    } else {
      create.mutate(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          areaId: areaId || undefined,
          permissionIds,
        },
        {
          onSuccess: (created) => {
            toast.show(`Rol "${created.name}" creado`)
            navigate(ROLES_ROUTES.detail(created.id), { replace: true })
          },
        },
      )
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        eyebrow={
          <Link to={ROLES_ROUTES.list}>
            <Icon name="arrowLeft" size={14} /> Roles y permisos
          </Link>
        }
        title={
          <span className="row" style={{ gap: 12 }}>
            {role ? role.name : 'Nuevo rol'}
            {isSystem && <Badge tone="accent">Sistema</Badge>}
            {role && !role.isActive && <Badge tone="danger">Inactivo</Badge>}
          </span>
        }
        description={
          role
            ? `Última modificación: ${formatDateTime(role.updatedAt)}`
            : 'Defina el nombre del rol y marque lo que podrán hacer los usuarios que lo tengan.'
        }
        actions={
          <>
            {role && !isSystem && can(PERMISSIONS.ROLES_DELETE) && (
              <Button
                variant="secondary"
                icon="trash"
                onClick={() => {
                  remove.reset()
                  setConfirmDelete(true)
                }}
              >
                Eliminar
              </Button>
            )}
            {!readOnly && (
              <Button type="submit" icon="check" loading={mutation.isPending}>
                {role ? 'Guardar cambios' : 'Crear rol'}
              </Button>
            )}
          </>
        }
      />

      <div className="stack">
        {isSystem && (
          <Alert tone="info">
            El rol <strong>Administrador</strong> lo gestiona el sistema: siempre tiene todos los
            permisos y no se puede modificar ni eliminar.
          </Alert>
        )}
        {mutation.isError && <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>}

        <section className="card">
          <header className="card__header">
            <div>
              <h2>Datos del rol</h2>
              <p>Un rol puede pertenecer a un área o ser general.</p>
            </div>
          </header>
          <div className="card__body">
            <fieldset disabled={readOnly} className="grid-2" style={{ border: 0, padding: 0, margin: 0 }}>
              <TextField
                label="Nombre"
                required
                minLength={3}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Encargado de corrales"
                autoFocus={!role}
              />
              <SelectField label="Área" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                <option value="">General (sin área)</option>
                {areaOptions.map((area) => (
                  <option
                    key={area.id}
                    value={area.id}
                    disabled={!area.isActive && area.id !== role?.area?.id}
                  >
                    {area.name}
                    {!area.isActive ? ' (inactiva)' : ''}
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                className="span-2"
                label="Descripción"
                maxLength={255}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {role && (
                <label className="switch span-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  {isActive ? 'Rol activo' : 'Rol inactivo: no aporta permisos a sus usuarios'}
                </label>
              )}
            </fieldset>
          </div>
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <h2>Permisos</h2>
              <p>
                {isSystem
                  ? 'Este rol tiene todos los permisos.'
                  : `${selected.size} de ${catalog.length} permisos seleccionados.`}
              </p>
            </div>
            {!readOnly && (
              <div className="row">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(new Set(catalog.map((p) => p.id)))}
                >
                  Marcar todos
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Quitar todos
                </Button>
              </div>
            )}
          </header>
          <div className="card__body">
            <PermissionPicker
              catalog={catalog}
              selected={isSystem ? new Set(catalog.map((p) => p.id)) : selected}
              onChange={setSelected}
              disabled={readOnly}
            />
          </div>
          {!readOnly && (
            <footer className="card__footer">
              <Button variant="secondary" onClick={() => navigate(ROLES_ROUTES.list)}>
                Cancelar
              </Button>
              <Button type="submit" icon="check" loading={mutation.isPending}>
                {role ? 'Guardar cambios' : 'Crear rol'}
              </Button>
            </footer>
          )}
        </section>
      </div>

      {role && (
        <ConfirmDialog
          open={confirmDelete}
          title="Eliminar rol"
          message={
            <>
              ¿Eliminar el rol <strong>{role.name}</strong>? Solo se puede eliminar si ningún
              usuario lo tiene asignado. Si solo quiere dejar de usarlo, desactívelo.
            </>
          }
          confirmLabel="Eliminar rol"
          loading={remove.isPending}
          error={remove.isError ? getErrorMessage(remove.error) : null}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() =>
            remove.mutate(role.id, {
              onSuccess: () => {
                toast.show(`Rol "${role.name}" eliminado`)
                navigate(ROLES_ROUTES.list, { replace: true })
              },
            })
          }
        />
      )}
    </form>
  )
}
