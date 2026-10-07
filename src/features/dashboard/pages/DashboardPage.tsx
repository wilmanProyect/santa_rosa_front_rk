import { Link } from 'react-router'
import { useAuth } from '@/features/auth'
import type { NavItem } from '@/shared/types/navigation.types'
import { PageHeader } from '@/shared/ui'
import './dashboard.css'

/** Página de inicio: accesos a los módulos que el usuario puede usar. */
export function DashboardPage({ modules }: { modules: NavItem[] }) {
  const { user, can } = useAuth()
  const available = modules.filter((item) => item.to !== '/' && can(...item.permissions))

  return (
    <>
      <PageHeader title={`Hola, ${user?.fullName ?? ''}`} description="¿Qué desea gestionar hoy?" />

      {available.length === 0 ? (
        <p className="muted">
          Su usuario todavía no tiene módulos asignados. Pida a un administrador que le asigne un rol.
        </p>
      ) : (
        <ul className="module-grid">
          {available.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="module-card">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
