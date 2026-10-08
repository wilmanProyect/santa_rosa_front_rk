import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { optional, todayIso } from '@/shared/lib/format'
import { Alert, Button, Dialog, SelectField, TextAreaField, TextField, useToast } from '@/shared/ui'
import { useChangeUserStatus } from '../hooks/useUsers'
import { INACTIVE_REASON_LABELS, type InactiveReason, type UserDetail } from '../types/user.types'

interface ChangeStatusDialogProps {
  open: boolean
  user: UserDetail
  onClose(): void
}

/** Dar de baja (con motivo) o reactivar a un usuario. */
export function ChangeStatusDialog({ open, user, onClose }: ChangeStatusDialogProps) {
  const deactivating = user.status === 'ACTIVE'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={deactivating ? 'Dar de baja al usuario' : 'Reactivar usuario'}
      description={user.fullName}
      size="sm"
      bare
    >
      <StatusForm key={`${user.id}-${user.status}`} user={user} onDone={onClose} />
    </Dialog>
  )
}

function StatusForm({ user, onDone }: { user: UserDetail; onDone(): void }) {
  const toast = useToast()
  const mutation = useChangeUserStatus()
  const deactivating = user.status === 'ACTIVE'

  const [reason, setReason] = useState<InactiveReason | ''>('')
  const [date, setDate] = useState(todayIso())
  const [notes, setNotes] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate(
      {
        id: user.id,
        body: deactivating
          ? { status: 'INACTIVE', reason: reason as InactiveReason, date, notes: optional(notes) }
          : { status: 'ACTIVE' },
      },
      {
        onSuccess: () => {
          toast.show(deactivating ? 'Usuario dado de baja' : 'Usuario reactivado')
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {mutation.isError && <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>}
        {deactivating ? (
          <>
            <Alert tone="warning">
              El usuario perderá el acceso de inmediato y se cerrarán sus sesiones abiertas.
            </Alert>
            <SelectField
              label="Motivo"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value as InactiveReason)}
            >
              <option value="" disabled>
                Seleccione un motivo
              </option>
              {Object.entries(INACTIVE_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Fecha de baja"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextAreaField
              label="Observaciones"
              maxLength={500}
              required={reason === 'OTHER'}
              hint={reason === 'OTHER' ? 'Detalle el motivo de la baja.' : undefined}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </>
        ) : (
          <p className="m-0">
            El usuario podrá volver a ingresar con su contraseña actual. Se borrarán el motivo, la
            fecha y las observaciones de la baja.
          </p>
        )}
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" variant={deactivating ? 'danger' : 'primary'} loading={mutation.isPending}>
          {deactivating ? 'Dar de baja' : 'Reactivar'}
        </Button>
      </footer>
    </form>
  )
}
