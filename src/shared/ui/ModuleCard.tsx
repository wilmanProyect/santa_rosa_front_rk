import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon, type IconName } from './Icon'
import './module-card.css'

export function ModuleGrid({ children }: { children: ReactNode }) {
  return <ul className="module-grid">{children}</ul>
}

interface ModuleCardBaseProps {
  icon: IconName
  title: string
  description: string
  /** Texto de la llamada a la acción. Por defecto, "Abrir". */
  action?: string
  tone?: 'default' | 'danger'
}

type ModuleCardProps = ModuleCardBaseProps &
  ({ to: string; onClick?: undefined } | { to?: undefined; onClick(): void })

/** Tarjeta de acceso a un módulo: enlace (`to`) o acción (`onClick`). Va dentro de `ModuleGrid`. */
export function ModuleCard({ icon, title, description, action = 'Abrir', tone = 'default', to, onClick }: ModuleCardProps) {
  const className = ['module-card', tone === 'danger' && 'module-card--danger'].filter(Boolean).join(' ')
  const content = (
    <>
      <span className="module-card__icon">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      <span className="module-card__desc">{description}</span>
      <span className="module-card__go">
        {action} <Icon name="chevronRight" size={16} />
      </span>
    </>
  )

  return (
    <li>
      {to !== undefined ? (
        <Link to={to} className={className}>
          {content}
        </Link>
      ) : (
        <button type="button" className={className} onClick={onClick}>
          {content}
        </button>
      )}
    </li>
  )
}
