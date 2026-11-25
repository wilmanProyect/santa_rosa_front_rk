import { Link } from 'react-router'
import { Badge, Icon, type IconName } from '@/shared/ui'
import { useControlsSummary } from '../hooks/useControls'
import { CONTROLS_ROUTES } from '../routes'
import { CONTROL_LABELS, CONTROL_TYPES, type ControlType } from '../types/controls.types'
import '../pages/controls.css'

const ICONS: Record<ControlType, IconName> = {
  WEANING: 'heart',
  WEIGHING: 'activity',
  HEALTH: 'shield',
}

/** Inicio: atrasados y para hoy de cada control que el usuario puede ver. */
export function ControlsSummaryCards() {
  const { data } = useControlsSummary()
  const types = CONTROL_TYPES.filter((t) => data?.controls[t])
  if (!data || types.length === 0) return null

  return (
    <section aria-label="Controles pendientes">
      <h2 className="section-title">Controles</h2>
      <ul className="controls-summary">
        {types.map((type) => {
          const counts = data.controls[type]!
          const clear = counts.overdue === 0 && counts.today === 0
          return (
            <li key={type}>
              <Link to={CONTROLS_ROUTES.forType(type)} className="controls-summary__card">
                <span className="row" style={{ gap: 8 }}>
                  <Icon name={ICONS[type]} size={18} />
                  <strong>{CONTROL_LABELS[type]}</strong>
                </span>
                <span className="controls-summary__counts">
                  {clear ? (
                    <Badge tone="success">Al día</Badge>
                  ) : (
                    <>
                      {counts.overdue > 0 && <Badge tone="danger">{counts.overdue} atrasado(s)</Badge>}
                      {counts.today > 0 && <Badge tone="warning">{counts.today} para hoy</Badge>}
                    </>
                  )}
                  {counts.upcoming > 0 && <Badge tone="info">{counts.upcoming} próximo(s)</Badge>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
