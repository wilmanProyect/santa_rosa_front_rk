import { AnimalDetailPage, type AnimalExtraTab } from '@/features/animals'
import { useAuth } from '@/features/auth'
import { AnimalHealthPanel } from '@/features/health'
import { PERMISSIONS } from '@/shared/config/permissions'

/** Pestaña "Sanidad" de la ficha: la aporta la feature `health`. */
const HEALTH_TAB: AnimalExtraTab = {
  id: 'sanidad',
  label: 'Sanidad',
  icon: 'shield',
  render: (animal) => <AnimalHealthPanel animal={animal} />,
  visible: (animal) => !animal.isExternal,
}

/**
 * Ficha del animal con las pestañas de otros módulos. Se conectan aquí para que `animals`
 * no dependa de `health` (que a su vez usa el buscador de animales).
 */
export function AnimalDetailRoute() {
  const { can } = useAuth()
  const extraTabs = can(PERMISSIONS.HEALTH_READ) ? [HEALTH_TAB] : []
  return <AnimalDetailPage extraTabs={extraTabs} />
}
