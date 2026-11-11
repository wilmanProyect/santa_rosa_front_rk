import { Badge } from '@/shared/ui'
import { ANIMAL_STATUS_LABELS, type AnimalStatus } from '../types/animal.types'

const STATUS_TONE: Record<AnimalStatus, 'success' | 'danger' | 'info' | 'neutral' | 'warning'> = {
  ALIVE: 'success',
  DEAD: 'neutral',
  SOLD: 'info',
  SLAUGHTERED: 'warning',
  GIFTED: 'info',
  EXCHANGED: 'info',
  LOST: 'warning',
}

export function AnimalStatusBadge({ status }: { status: AnimalStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{ANIMAL_STATUS_LABELS[status]}</Badge>
}

interface AnimalFlagsProps {
  isExternal: boolean
  identifierException: boolean
}

/** Insignias "Externo" y "Caso especial". */
export function AnimalFlags({ isExternal, identifierException }: AnimalFlagsProps) {
  return (
    <>
      {isExternal && <Badge tone="accent">Externo</Badge>}
      {identifierException && <Badge tone="warning">Caso especial</Badge>}
    </>
  )
}
