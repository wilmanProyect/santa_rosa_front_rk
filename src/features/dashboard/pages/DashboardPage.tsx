import { Link } from 'react-router'
import { useAuth } from '@/features/auth'
import { RemindersCard } from '@/features/health'
import { PERMISSIONS } from '@/shared/config/permissions'
import type { NavItem } from '@/shared/types/navigation.types'
import { BrandLogo, Icon } from '@/shared/ui'
import './dashboard.css'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Página de inicio: accesos a los módulos que el usuario puede usar. */
export function DashboardPage({ modules }: { modules: NavItem[] }) {
  const { user, can } = useAuth()
  const available = modules.filter((item) => item.to !== '/' && can(...item.permissions))
  const firstName = user?.fullName.split(' ')[0] ?? ''

  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">{greeting()}</p>
          <h1>{firstName}, ¿qué desea gestionar hoy?</h1>
          <p>Administre el ganado de la cabaña, su sanidad y el personal que trabaja en ella.</p>
        </div>
        <BrandLogo variant="isotype" tone="ochre" className="hero__mark" />
      </section>

      {can(PERMISSIONS.ANIMALS_READ, PERMISSIONS.HEALTH_READ) && (
        <div style={{ marginBottom: 28 }}>
          <RemindersCard />
        </div>
      )}

      {available.length === 0 ? (
        <div className="card empty">
          <Icon name="lock" size={28} />
          <p className="m-0">
            Su usuario todavía no tiene módulos asignados. Pida a un administrador que le asigne un
            rol.
          </p>
        </div>
      ) : (
        <>
          <h2 className="section-title">Módulos</h2>
          <ul className="module-grid">
            {available.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="module-card">
                  <span className="module-card__icon">
                    <Icon name={item.icon} size={22} />
                  </span>
                  <strong>{item.label}</strong>
                  <span className="module-card__desc">{item.description}</span>
                  <span className="module-card__go">
                    Abrir <Icon name="chevronRight" size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
