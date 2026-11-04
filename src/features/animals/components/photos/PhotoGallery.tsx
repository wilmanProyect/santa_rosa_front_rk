import { useState } from 'react'
import { Can } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDate, formatDateTime } from '@/shared/lib/format'
import { Alert, Button, Icon, Pagination, Spinner } from '@/shared/ui'
import { usePhotos } from '../../hooks/usePhotos'
import type { AnimalDetail } from '../../types/animal.types'
import { PhotoUploadDialog } from './PhotoUploadDialog'
import { PhotoViewer } from './PhotoViewer'

const PAGE_SIZE = 24

/** Historial de fotos del animal, de la más reciente a la más antigua. */
export function PhotoGallery({ animal }: { animal: AnimalDetail }) {
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const { data, isPending, isError, error, refetch } = usePhotos(animal.id, page, PAGE_SIZE)

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Fotos</h2>
          <p>{data ? `${data.total} foto(s) en el historial.` : 'Historial de fotos del animal.'}</p>
        </div>
        <Can permissions={[PERMISSIONS.ANIMAL_PHOTOS_UPLOAD]}>
          <Button icon="camera" onClick={() => setUploading(true)}>
            Subir fotos
          </Button>
        </Can>
      </header>
      <div className="card__body">
        {isPending && <Spinner />}
        {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
        {data && data.items.length === 0 && (
          <div className="empty">
            <Icon name="image" size={28} />
            Este animal todavía no tiene fotos.
          </div>
        )}
        {data && data.items.length > 0 && (
          <>
            <div className="gallery">
              {data.items.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className="gallery__item"
                  onClick={() => setViewing(photo.id)}
                >
                  <span className="gallery__frame">
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.description ?? 'Foto del animal'}
                      loading="lazy"
                      // Si la URL firmada venció, se piden URL nuevas (solo entonces, para no
                      // repetir la petición si la imagen falla por otro motivo).
                      onError={() => {
                        if (Date.parse(photo.urlsExpireAt) <= Date.now()) void refetch()
                      }}
                    />
                    {photo.isPrimary && (
                      <span className="gallery__star">
                        <Icon name="star" size={12} /> Principal
                      </span>
                    )}
                  </span>
                  <span className="gallery__meta">
                    <strong>
                      {photo.takenAt ? formatDate(photo.takenAt) : formatDateTime(photo.uploadedAt)}
                    </strong>
                    {photo.description && <span className="muted truncate"> · {photo.description}</span>}
                  </span>
                </button>
              ))}
            </div>
            {data.total > PAGE_SIZE && (
              <Pagination
                page={data.page}
                limit={data.limit}
                total={data.total}
                noun="foto(s)"
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>

      <PhotoViewer
        animalId={animal.id}
        photoId={viewing}
        minDate={animal.birthDate}
        onClose={() => setViewing(null)}
      />
      <PhotoUploadDialog
        open={uploading}
        animalId={animal.id}
        minDate={animal.birthDate}
        onClose={() => setUploading(false)}
        onShowPhoto={(photoId) => {
          setUploading(false)
          setViewing(photoId)
        }}
      />
    </section>
  )
}
