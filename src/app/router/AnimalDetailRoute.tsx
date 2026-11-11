import { AnimalDetailPage, type AnimalExtraTab } from '@/features/animals'
import { useAuth } from '@/features/auth'
import { AnimalHealthPanel } from '@/features/health'
import { AnimalReproductionPanel } from '@/features/reproduction'
import { PERMISSIONS } from '@/shared/config/permissions'

/** Pestaña "Sanidad" de la ficha: la aporta la feature `health`. */
const HEALTH_TAB: AnimalExtraTab = {
  id: 'sanidad',
  label: 'Sanidad',
  icon: 'shield',
  render: (animal) => <AnimalHealthPanel animal={animal} />,
  visible: (animal) => !animal.isExternal,
}

/** Pestaña "Reproducción": montas y partos como madre o padre (también para reproductores externos). */
const REPRODUCTION_TAB: AnimalExtraTab = {
  id: 'reproduccion',
  label: 'Reproducción',
  icon: 'heart',
  render: (animal) => <AnimalReproductionPanel animal={animal} />,
}

/**
 * Ficha del animal con las pestañas de otros módulos. Se conectan aquí para que `animals`
 * no dependa de `health` ni de `reproduction` (que a su vez usan el buscador de animales).
 */
export function AnimalDetailRoute() {
  const { can } = useAuth()
  const extraTabs = [
    ...(can(PERMISSIONS.HEALTH_READ) ? [HEALTH_TAB] : []),
    ...(can(PERMISSIONS.REPRODUCTION_READ) ? [REPRODUCTION_TAB] : []),
  ]
  return <AnimalDetailPage extraTabs={extraTabs} />
}
