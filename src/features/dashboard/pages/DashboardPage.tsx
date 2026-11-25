import { useAuth } from '@/features/auth'
import { ControlsSummaryCards } from '@/features/controls'
import { RemindersCard } from '@/features/health'
import { PERMISSIONS } from '@/shared/config/permissions'
import type { NavItem } from '@/shared/types/navigation.types'
import { isNavItemAllowed } from '@/shared/lib/navigation'
import { BrandLogo, Icon, ModuleCard, ModuleGrid } from '@/shared/ui'
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
  const available = modules.filter(
    (item) => item.to !== '/' && item.placement !== 'settings' && isNavItemAllowed(item, can),
  )
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

      <ControlsSummaryCards />

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
          <ModuleGrid>
            {available.map((item) => (
              <ModuleCard
                key={item.to}
                to={item.to}
                icon={item.icon}
                title={item.label}
                description={item.description}
              />
            ))}
          </ModuleGrid>
        </>
      )}
    </>
  )
}
