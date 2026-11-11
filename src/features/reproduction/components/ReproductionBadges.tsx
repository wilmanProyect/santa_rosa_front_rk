import { Link } from 'react-router'
import { ANIMALS_ROUTES, animalLabel, geneticCategoryShort } from '@/features/animals'
import { Badge } from '@/shared/ui'
import {
  LITTER_TYPE_LABELS,
  SERVICE_STATUS_LABELS,
  type BreedingAnimalRef,
  type LitterType,
  type ServiceStatus,
} from '../types/reproduction.types'

const STATUS_TONE: Record<ServiceStatus, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
  PENDING: 'neutral',
  PREGNANT: 'success',
  EMPTY: 'warning',
  BIRTHED: 'info',
  ABORTED: 'danger',
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{SERVICE_STATUS_LABELS[status]}</Badge>
}

export function KinshipOverrideBadge() {
  return (
    <span title="Se registró pese al parentesco, con autorización">
      <Badge tone="warning">Autorizada con parentesco</Badge>
    </span>
  )
}

export function LitterBadge({ type, size }: { type: LitterType; size: number }) {
  return <Badge tone={size > 1 ? 'accent' : 'neutral'}>{LITTER_TYPE_LABELS[type]}</Badge>
}

interface AnimalRefLinkProps {
  animal: Pick<BreedingAnimalRef, 'id' | 'earTag' | 'name'> & Partial<BreedingAnimalRef>
  /** Muestra la categoría genética junto al nombre. */
  showCategory?: boolean
  /** Evita que el clic llegue a la fila (tablas con filas clicables). */
  stopPropagation?: boolean
}

/** Enlace a la ficha de un animal, con la insignia "Externo". */
export function AnimalRefLink({ animal, showCategory = false, stopPropagation = false }: AnimalRefLinkProps) {
  return (
    <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      <Link
        to={ANIMALS_ROUTES.detail(animal.id)}
        className="table__primary"
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      >
        {animalLabel(animal)}
      </Link>
      {animal.isExternal && <Badge tone="accent">Externo</Badge>}
      {showCategory && animal.geneticCategory && (
        <span className="muted small">{geneticCategoryShort(animal.geneticCategory)}</span>
      )}
    </span>
  )
}
