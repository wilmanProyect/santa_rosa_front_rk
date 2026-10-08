import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Button, TextField } from '@/shared/ui'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../hooks/useAuth'

const PASSWORD_RULES = 'Mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número.'

export function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirmation) {
      setError('La confirmación no coincide con la nueva contraseña')
      return
    }
    setSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword })
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <header>
        <h1>Cambiar contraseña</h1>
        {user?.mustChangePassword && (
          <p className="auth-card__lead">
            Por seguridad, debe definir una contraseña propia antes de continuar.
          </p>
        )}
      </header>

      <form className="form" onSubmit={handleSubmit}>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField
          id="current-password"
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <TextField
          id="new-password"
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          hint={PASSWORD_RULES}
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          id="confirm-password"
          label="Repetir nueva contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <Button type="submit" loading={submitting}>
          Guardar contraseña
        </Button>
        {user?.mustChangePassword ? (
          <Button variant="ghost" onClick={() => void logout()}>
            Cerrar sesión
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Volver
          </Button>
        )}
      </form>
    </AuthLayout>
  )
}
