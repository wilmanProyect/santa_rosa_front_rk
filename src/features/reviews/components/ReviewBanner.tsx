import { useState } from 'react'
import { Link } from 'react-router'
import { Can } from '@/features/auth'
import { PERMISSIONS } from '@/shared/config/permissions'
import { Button, Icon } from '@/shared/ui'
import { useEntityReviews } from '../hooks/useReviews'
import { REVIEW_TARGET_PATH } from '../routes'
import { REVIEW_CATEGORY_LABELS, type DataReview, type ReviewEntityType } from '../types/review.types'
import { ResolveReviewDialog } from './ResolveReviewDialog'
import './reviews.css'

interface ReviewBannerProps {
  entityType: ReviewEntityType
  entityId: string
}

/**
 * Aviso "Datos por revisar" en la ficha de un animal, parto o monta: muestra los
 * avisos pendientes, los demás registros involucrados y el botón para marcarlos
 * como corregidos. No muestra nada si no hay avisos o falta `reviews:read`.
 */
export function ReviewBanner({ entityType, entityId }: ReviewBannerProps) {
  const { data } = useEntityReviews(entityType, entityId)
  const [resolving, setResolving] = useState<DataReview | null>(null)
  const reviews = data?.items ?? []
  if (reviews.length === 0) return null

  return (
    <section className="review-banner" role="status" aria-label="Datos por revisar">
      <header className="review-banner__header">
        <Icon name="alert" size={16} />
        <strong>Datos por revisar</strong>
        {reviews.length > 1 && <span className="review-banner__count">{reviews.length} avisos</span>}
      </header>
      <ul className="review-banner__list">
        {reviews.map((review) => (
          <li key={review.id} className="review-banner__item">
            <div className="review-banner__meta">
              <span className="review-banner__category">{REVIEW_CATEGORY_LABELS[review.category]}</span>
              {review.source && <span className="review-banner__source">{review.source}</span>}
            </div>
            <p className="review-banner__message">{review.message}</p>
            <RelatedTargets review={review} current={{ entityType, entityId }} />
            <Can permissions={[PERMISSIONS.REVIEWS_RESOLVE]}>
              <div>
                <Button size="sm" variant="secondary" icon="check" onClick={() => setResolving(review)}>
                  Marcar como corregido
                </Button>
              </div>
            </Can>
          </li>
        ))}
      </ul>
      <ResolveReviewDialog review={resolving} onClose={() => setResolving(null)} />
    </section>
  )
}

/** Los otros registros del aviso, con enlace a su ficha. */
export function RelatedTargets({
  review,
  current,
}: {
  review: DataReview
  current?: { entityType: ReviewEntityType; entityId: string }
}) {
  const others = review.targets.filter(
    (t) => !current || t.entityType !== current.entityType || t.entityId !== current.entityId,
  )
  if (others.length === 0) return null
  return (
    <ul className="review-targets">
      {others.map((t) => (
        <li key={`${t.entityType}:${t.entityId}`}>
          {t.role && <span className="review-targets__role">{t.role}:</span>}{' '}
          {t.exists ? (
            <Link to={REVIEW_TARGET_PATH[t.entityType](t.entityId)}>{t.label}</Link>
          ) : (
            <span className="muted">{t.label} (eliminado)</span>
          )}
        </li>
      ))}
    </ul>
  )
}
