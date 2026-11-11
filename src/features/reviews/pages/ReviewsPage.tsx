import { useState } from 'react'
import { Can } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatDateTime } from '@/shared/lib/format'
import { Alert, Badge, Button, Icon, PageHeader, Pagination, SelectField, Spinner, TextField, useToast } from '@/shared/ui'
import { RelatedTargets } from '../components/ReviewBanner'
import { ResolveReviewDialog } from '../components/ResolveReviewDialog'
import { useReopenReview, useReviews } from '../hooks/useReviews'
import {
  REVIEW_CATEGORY_LABELS,
  REVIEW_STATUS_LABELS,
  type DataReview,
  type ReviewCategory,
  type ReviewStatus,
} from '../types/review.types'
import '../components/reviews.css'

const PAGE_SIZE = 20

/** Todos los avisos de revisión de datos, para repartirlos y hacer el seguimiento. */
export function ReviewsPage() {
  const [status, setStatus] = useState<ReviewStatus | ''>('OPEN')
  const [category, setCategory] = useState<ReviewCategory | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [resolving, setResolving] = useState<DataReview | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const { data, isPending, isError, error, isFetching } = useReviews({
    status: status || undefined,
    category: category || undefined,
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const filter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  return (
    <>
      <PageHeader
        eyebrow="Revisión de datos"
        title="Datos por revisar"
        description="Diferencias encontradas en los datos (por ejemplo, al cruzar la planilla de montas con el sistema). Cada aviso también se muestra en la ficha de los animales y partos involucrados hasta que se marca como corregido."
      />

      <div className="toolbar">
        <SelectField
          label="Estado"
          className="visually-hidden-label"
          value={status}
          onChange={(e) => filter(setStatus)(e.target.value as ReviewStatus | '')}
        >
          <option value="OPEN">Pendientes</option>
          <option value="RESOLVED">Corregidos</option>
          <option value="">Todos</option>
        </SelectField>
        <SelectField
          label="Tipo"
          className="visually-hidden-label"
          value={category}
          onChange={(e) => filter(setCategory)(e.target.value as ReviewCategory | '')}
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(REVIEW_CATEGORY_LABELS) as ReviewCategory[]).map((c) => (
            <option key={c} value={c}>
              {REVIEW_CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Buscar"
          className="visually-hidden-label"
          type="search"
          placeholder="Buscar arete o nombre en el aviso"
          value={search}
          onChange={(e) => filter(setSearch)(e.target.value)}
        />
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
      {data && (
        <div className="stack" aria-busy={isFetching}>
          {data.items.length === 0 && (
            <div className="card empty">
              <Icon name="check" size={28} />
              {status === 'OPEN' ? 'No hay datos pendientes de revisar.' : 'No hay avisos que coincidan con los filtros.'}
            </div>
          )}
          {data.items.map((review) => (
            <ReviewCard key={review.id} review={review} onResolve={() => setResolving(review)} />
          ))}
          <Pagination page={data.page} limit={data.limit} total={data.total} noun="aviso(s)" onChange={setPage} />
        </div>
      )}

      <ResolveReviewDialog review={resolving} onClose={() => setResolving(null)} />
    </>
  )
}

function ReviewCard({ review, onResolve }: { review: DataReview; onResolve(): void }) {
  const toast = useToast()
  const reopen = useReopenReview()
  const resolved = review.status === 'RESOLVED'

  return (
    <article className={`card card__body review-card${resolved ? ' is-resolved' : ''}`}>
      <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
        <span className="row" style={{ gap: 6 }}>
          <Badge tone={resolved ? 'success' : 'warning'}>{REVIEW_STATUS_LABELS[review.status]}</Badge>
          <Badge tone="neutral">{REVIEW_CATEGORY_LABELS[review.category]}</Badge>
        </span>
        <span className="muted small">
          {review.source ?? 'Creado a mano'} · {formatDateTime(review.createdAt)}
        </span>
      </div>
      <p className="m-0">{review.message}</p>
      <RelatedTargets review={review} />
      {resolved && review.resolution && (
        <div className="review-card__resolution">
          <strong>Corregido</strong>
          {review.resolvedAt && <> el {formatDateTime(review.resolvedAt)}</>}: {review.resolution}
        </div>
      )}
      <Can permissions={[PERMISSIONS.REVIEWS_RESOLVE]}>
        <div className="row" style={{ gap: 8 }}>
          {resolved ? (
            <Button
              size="sm"
              variant="ghost"
              loading={reopen.isPending}
              onClick={() =>
                reopen.mutate(review.id, {
                  onSuccess: () => toast.show('El aviso volvió a quedar pendiente'),
                })
              }
            >
              Reabrir
            </Button>
          ) : (
            <Button size="sm" variant="secondary" icon="check" onClick={onResolve}>
              Marcar como corregido
            </Button>
          )}
        </div>
      </Can>
      {reopen.isError && <Alert tone="error">{getErrorMessage(reopen.error)}</Alert>}
    </article>
  )
}
