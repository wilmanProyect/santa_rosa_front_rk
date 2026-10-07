import { NavLink, Outlet } from 'react-router'
import { AUTH_ROUTES, useAuth } from '@/features/auth'
import { Button } from '@/shared/ui'
import { NAVIGATION } from '../navigation'
import './main-layout.css'

export function MainLayout() {
  const { user, can, logout } = useAuth()
  const items = NAVIGATION.filter((item) => can(...item.permissions))

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="layout__brand">Santa Rosa</div>
        <nav aria-label="Principal">
          <ul>
            {items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="layout__user">
          <div>
            <strong>{user?.fullName}</strong>
            <span className="muted">@{user?.username}</span>
          </div>
          <NavLink to={AUTH_ROUTES.changePassword}>Cambiar contraseña</NavLink>
          <Button variant="secondary" onClick={() => void logout()}>
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  )
}
