import { Navigate, Outlet, useLocation } from 'react-router'
import { Spinner } from '@/shared/ui'
import { useAuth } from '../hooks/useAuth'
import { AUTH_ROUTES } from '../routes'

/**
 * Protege las rutas privadas: exige sesión y, si el usuario debe cambiar
 * su contraseña, lo lleva a esa pantalla antes de dejarlo continuar.
 */
export function RequireAuth() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <Spinner label="Verificando sesión…" />
  }

  if (status === 'anonymous' || !user) {
    return <Navigate to={AUTH_ROUTES.login} replace state={{ from: location.pathname }} />
  }

  if (user.mustChangePassword && location.pathname !== AUTH_ROUTES.changePassword) {
    return <Navigate to={AUTH_ROUTES.changePassword} replace />
  }

  return <Outlet />
}
