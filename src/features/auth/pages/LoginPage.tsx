import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Button, TextField } from '@/shared/ui'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../hooks/useAuth'
import { AUTH_ROUTES } from '../routes'

export function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login({ username, password })
      navigate(user.mustChangePassword ? AUTH_ROUTES.changePassword : from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <header>
        <h1>Bienvenido</h1>
        <p className="auth-card__lead">Ingrese con su usuario y contraseña.</p>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField
          id="login-username"
          label="Usuario"
          autoComplete="username"
          autoFocus
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          id="login-password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={submitting}>
          Ingresar
        </Button>
      </form>
    </AuthLayout>
  )
}
