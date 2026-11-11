import { Icon } from '@/shared/ui'
import { useOpenReviewTargets } from '../hooks/useReviews'
import type { ReviewEntityType } from '../types/review.types'
import './reviews.css'

interface ReviewFlagProps {
  entityType: ReviewEntityType
  entityId: string
}

/** Marca chica "Revisar" para las filas de los listados con avisos pendientes. */
export function ReviewFlag({ entityType, entityId }: ReviewFlagProps) {
  const { data } = useOpenReviewTargets(entityType)
  const count = data?.get(entityId)
  if (!count) return null
  return (
    <span className="review-flag" title={count === 1 ? 'Tiene un dato por revisar' : `Tiene ${count} datos por revisar`}>
      <Icon name="alert" size={12} />
      Revisar
    </span>
  )
}
