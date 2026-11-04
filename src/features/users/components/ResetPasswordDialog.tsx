import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Button, Dialog, TextField, useToast } from '@/shared/ui'
import { useResetUserPassword } from '../hooks/useUsers'
import {
  generateTemporaryPassword,
  isValidPassword,
  PASSWORD_PATTERN,
  PASSWORD_RULES,
} from '@/shared/lib/password'
import type { UserDetail } from '../types/user.types'

interface ResetPasswordDialogProps {
  open: boolean
  user: UserDetail
  onClose(): void
}

export function ResetPasswordDialog({ open, user, onClose }: ResetPasswordDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Restablecer contraseña"
      description={`${user.fullName} (@${user.username})`}
      size="sm"
      bare
    >
      <ResetForm key={user.id} user={user} onDone={onClose} />
    </Dialog>
  )
}

function ResetForm({ user, onDone }: { user: UserDetail; onDone(): void }) {
  const toast = useToast()
  const mutation = useResetUserPassword()
  const [password, setPassword] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValidPassword(password)) {
      toast.show(PASSWORD_RULES, 'error')
      return
    }
    mutation.mutate(
      { id: user.id, newPassword: password },
      {
        onSuccess: () => {
          toast.show(`Contraseña restablecida. Entréguela a @${user.username}.`)
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {mutation.isError && <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>}
        <Alert tone="info">
          Se cerrarán todas sus sesiones, se desbloqueará la cuenta y deberá cambiar esta contraseña
          en su próximo ingreso.
        </Alert>
        <TextField
          label="Contraseña temporal"
          required
          pattern={PASSWORD_PATTERN}
          title={PASSWORD_RULES}
          hint={PASSWORD_RULES}
          autoComplete="new-password"
          autoFocus
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
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Restablecer
        </Button>
      </footer>
    </form>
  )
}
