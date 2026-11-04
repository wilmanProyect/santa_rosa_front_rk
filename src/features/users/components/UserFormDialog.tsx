import { useState, type FormEvent } from 'react'
import { useAreas } from '@/features/areas'
import { useAuth } from '@/features/auth'
import { useRoles } from '@/features/roles'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { nullable, optional, todayIso } from '@/shared/lib/format'
import { Alert, Button, Dialog, SelectField, TextField, useToast } from '@/shared/ui'
import { useCreateUser, useUpdateUser } from '../hooks/useUsers'
import {
  generateTemporaryPassword,
  isValidPassword,
  PASSWORD_PATTERN,
  PASSWORD_RULES,
} from '@/shared/lib/password'
import type { UpdateUserRequest, UserDetail } from '../types/user.types'

interface UserFormDialogProps {
  open: boolean
  /** Usuario a editar; sin él, el formulario crea uno nuevo. */
  user?: UserDetail | null
  onClose(): void
  onCreated?(user: UserDetail): void
}

export function UserFormDialog({ open, user, onClose, onCreated }: UserFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={user ? 'Editar datos del usuario' : 'Nuevo usuario'}
      description={
        user
          ? 'El estado, los roles y la contraseña se gestionan desde su ficha.'
          : 'La contraseña que defina es temporal: el usuario deberá cambiarla al ingresar.'
      }
      size="lg"
      bare
    >
      <UserForm key={user?.id ?? 'new'} user={user ?? null} onDone={onClose} onCreated={onCreated} />
    </Dialog>
  )
}

const EMPTY = {
  firstName: '',
  paternalLastName: '',
  maternalLastName: '',
  ciNumber: '',
  username: '',
  email: '',
  birthDate: '',
  phone: '',
  position: '',
  areaId: '',
}

type FormValues = typeof EMPTY

function toFormValues(user: UserDetail): FormValues {
  return {
    firstName: user.firstName,
    paternalLastName: user.paternalLastName,
    maternalLastName: user.maternalLastName ?? '',
    ciNumber: user.ciNumber ?? '',
    username: user.username,
    email: user.email ?? '',
    birthDate: user.birthDate ?? '',
    phone: user.phone ?? '',
    position: user.position ?? '',
    areaId: user.area?.id ?? '',
  }
}

/** PATCH solo con los campos modificados (el backend rechaza valores vacíos en los obligatorios). */
function buildUpdate(initial: FormValues, values: FormValues): UpdateUserRequest {
  const body: UpdateUserRequest = {}
  const changed = (key: keyof FormValues) => initial[key].trim() !== values[key].trim()

  for (const key of ['firstName', 'paternalLastName', 'ciNumber', 'username', 'email', 'birthDate'] as const) {
    if (changed(key)) body[key] = values[key].trim()
  }
  for (const key of ['maternalLastName', 'phone', 'position', 'areaId'] as const) {
    if (changed(key)) body[key] = nullable(values[key])
  }
  return body
}

interface UserFormProps {
  user: UserDetail | null
  onDone(): void
  onCreated?(user: UserDetail): void
}

function UserForm({ user, onDone, onCreated }: UserFormProps) {
  const toast = useToast()
  const { can } = useAuth()
  const create = useCreateUser()
  const update = useUpdateUser()
  const mutation = user ? update : create

  const initial = user ? toFormValues(user) : EMPTY
  const [values, setValues] = useState<FormValues>(initial)
  const [password, setPassword] = useState('')
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set())

  const canPickRoles = !user && can(PERMISSIONS.ROLES_READ)
  const { data: areas } = useAreas()
  const { data: roles } = useRoles({ isActive: true })
  // Primero los roles del área elegida, luego los generales y al final los de otras áreas.
  const roleRank = (areaId: string | undefined) =>
    areaId === undefined ? 1 : areaId === values.areaId ? 0 : 2
  const roleOptions = roles && [...roles].sort((a, b) => roleRank(a.area?.id) - roleRank(b.area?.id))

  const set = (key: keyof FormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (user) {
      const body = buildUpdate(initial, values)
      if (Object.keys(body).length === 0) {
        onDone()
        return
      }
      update.mutate(
        { id: user.id, body },
        {
          onSuccess: () => {
            toast.show('Datos del usuario actualizados')
            onDone()
          },
        },
      )
      return
    }
    if (!isValidPassword(password)) {
      toast.show(PASSWORD_RULES, 'error')
      return
    }
    create.mutate(
      {
        firstName: values.firstName.trim(),
        paternalLastName: values.paternalLastName.trim(),
        maternalLastName: optional(values.maternalLastName),
        ciNumber: values.ciNumber.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        password,
        birthDate: values.birthDate,
        phone: optional(values.phone),
        position: optional(values.position),
        areaId: optional(values.areaId),
        roleIds: roleIds.size > 0 ? [...roleIds] : undefined,
      },
      {
        onSuccess: (created) => {
          toast.show(`Usuario @${created.username} creado`)
          onDone()
          onCreated?.(created)
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {mutation.isError && <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>}

        <h3 className="form-section-title">Datos personales</h3>
        <div className="grid-2">
          <TextField
            className="span-2"
            label="Nombre(s)"
            required
            maxLength={100}
            autoFocus
            value={values.firstName}
            onChange={set('firstName')}
          />
          <TextField
            label="Apellido paterno"
            required
            maxLength={100}
            value={values.paternalLastName}
            onChange={set('paternalLastName')}
          />
          <TextField
            label="Apellido materno"
            maxLength={100}
            value={values.maternalLastName}
            onChange={set('maternalLastName')}
          />
          <TextField
            label="Número de CI"
            required={!user || initial.ciNumber !== ''}
            pattern="\d{4,12}(-[0-9A-Za-z]{1,3})?"
            title="De 4 a 12 dígitos, con complemento opcional: 1234567 o 1234567-1B"
            hint="Ej. 1234567 o 1234567-1B"
            value={values.ciNumber}
            onChange={set('ciNumber')}
          />
          <TextField
            label="Fecha de nacimiento"
            type="date"
            required={!user || initial.birthDate !== ''}
            max={todayIso()}
            value={values.birthDate}
            onChange={set('birthDate')}
          />
          <TextField
            label="Teléfono"
            type="tel"
            pattern="\+?[0-9 \-]{6,20}"
            title="De 6 a 20 caracteres: dígitos, espacios, guiones y + inicial"
            placeholder="+591 71234567"
            value={values.phone}
            onChange={set('phone')}
          />
          <TextField
            label="Correo electrónico"
            type="email"
            required={!user || initial.email !== ''}
            maxLength={150}
            value={values.email}
            onChange={set('email')}
          />
        </div>

        <h3 className="form-section-title">Trabajo</h3>
        <div className="grid-2">
          <SelectField label="Área" value={values.areaId} onChange={set('areaId')}>
            <option value="">Sin área</option>
            {areas?.map((area) => (
              <option
                key={area.id}
                value={area.id}
                disabled={!area.isActive && area.id !== initial.areaId}
              >
                {area.name}
                {!area.isActive ? ' (inactiva)' : ''}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Cargo"
            maxLength={100}
            placeholder="Ej. Encargado de corrales"
            value={values.position}
            onChange={set('position')}
          />
        </div>

        <h3 className="form-section-title">Acceso</h3>
        <div className="grid-2">
          <TextField
            label="Usuario"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9._\-]{3,30}"
            title="De 3 a 30 caracteres: letras, números, punto, guion o guion bajo"
            hint="Letras, números, . - _ (se guarda en minúsculas)"
            autoComplete="off"
            value={values.username}
            onChange={set('username')}
          />
          {!user && (
            <div className="stack stack--sm">
              <TextField
                label="Contraseña temporal"
                required
                pattern={PASSWORD_PATTERN}
                title={PASSWORD_RULES}
                hint={PASSWORD_RULES}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                size="sm"
                variant="ghost"
                icon="key"
                onClick={() => setPassword(generateTemporaryPassword())}
                style={{ alignSelf: 'flex-start' }}
              >
                Generar contraseña
              </Button>
            </div>
          )}
        </div>

        {canPickRoles && roleOptions && roleOptions.length > 0 && (
          <>
            <h3 className="form-section-title">Roles</h3>
            <div className="choice-grid">
              {roleOptions.map((role) => (
                <label key={role.id} className="checkbox choice">
                  <input
                    type="checkbox"
                    checked={roleIds.has(role.id)}
                    onChange={(e) =>
                      setRoleIds((current) => {
                        const next = new Set(current)
                        if (e.target.checked) next.add(role.id)
                        else next.delete(role.id)
                        return next
                      })
                    }
                  />
                  <span>
                    <strong>{role.name}</strong>
                    <span className="muted small">
                      {' '}
                      · {role.area?.name ?? 'General'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {user ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      </footer>
    </form>
  )
}
