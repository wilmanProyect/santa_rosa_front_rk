import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatBytes, formatDate, formatDateTime, nullable, todayIso } from '@/shared/lib/format'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataItem,
  Dialog,
  Icon,
  Spinner,
  TextAreaField,
  TextField,
  useToast,
} from '@/shared/ui'
import { photosApi } from '../../api/animals.api'
import { photosKeys, useDeletePhoto, useSetPrimaryPhoto, useUpdatePhoto } from '../../hooks/usePhotos'
import type { AnimalPhoto } from '../../types/animal.types'

interface PhotoViewerProps {
  animalId: string
  photoId: string | null
  minDate?: string | null
  onClose(): void
}

/** Foto en grande con sus datos y acciones. Pide la foto al abrir, así trae URL vigentes. */
export function PhotoViewer({ animalId, photoId, minDate, onClose }: PhotoViewerProps) {
  const { data: photo, isError, error } = useQuery({
    queryKey: [...photosKeys.all(animalId), 'photo', photoId],
    queryFn: () => photosApi.get(animalId, photoId!),
    enabled: !!photoId,
    staleTime: 0,
  })

  return (
    <Dialog open={!!photoId} onClose={onClose} title="Foto" size="lg">
      {isError ? (
        <Alert tone="error">{getErrorMessage(error)}</Alert>
      ) : !photo ? (
        <Spinner />
      ) : (
        <ViewerBody key={photo.id} photo={photo} minDate={minDate} onClose={onClose} />
      )}
    </Dialog>
  )
}

function ViewerBody({
  photo,
  minDate,
  onClose,
}: {
  photo: AnimalPhoto
  minDate?: string | null
  onClose(): void
}) {
  const { can } = useAuth()
  const toast = useToast()
  const setPrimary = useSetPrimaryPhoto()
  const remove = useDeletePhoto()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const canUpload = can(PERMISSIONS.ANIMAL_PHOTOS_UPLOAD)
  const ids = { animalId: photo.animalId, photoId: photo.id }

  return (
    <div className="viewer">
      <img
        className="viewer__image"
        src={photo.url}
        alt={photo.description ?? 'Foto del animal'}
        width={photo.file.width}
        height={photo.file.height}
        style={{ aspectRatio: `${photo.file.width} / ${photo.file.height}` }}
      />

      <div className="stack">
        {photo.isPrimary && (
          <Badge tone="accent">
            <Icon name="star" size={12} /> Foto principal
          </Badge>
        )}

        {editing ? (
          <EditPhotoForm photo={photo} minDate={minDate} onDone={() => setEditing(false)} />
        ) : (
          <>
            {photo.description && <p className="m-0">{photo.description}</p>}
            <dl className="data-list" style={{ gridTemplateColumns: '1fr' }}>
              <DataItem
                label="Fecha de la foto"
                value={
                  photo.takenAt && (
                    <>
                      {formatDate(photo.takenAt)}
                      {photo.takenAtSource === 'EXIF' && <span className="muted"> (según la cámara)</span>}
                    </>
                  )
                }
              />
              <DataItem
                label="Subida"
                value={`${photo.uploadedBy.fullName} · ${formatDateTime(photo.uploadedAt)}`}
              />
              <DataItem
                label="Archivo"
                value={`${photo.file.width} × ${photo.file.height} px · ${formatBytes(photo.file.sizeBytes)}`}
              />
            </dl>
          </>
        )}

        {!editing && (
          <div className="stack stack--sm">
            <a className="btn btn--secondary btn--sm" href={photo.downloadUrl} download={photo.file.fileName}>
              <Icon name="download" size={16} /> Descargar original
            </a>
            {canUpload && (
              <Button variant="secondary" size="sm" icon="edit" onClick={() => setEditing(true)}>
                Editar descripción o fecha
              </Button>
            )}
            {canUpload && !photo.isPrimary && (
              <Button
                variant="secondary"
                size="sm"
                icon="star"
                loading={setPrimary.isPending}
                onClick={() =>
                  setPrimary.mutate(ids, {
                    onSuccess: () => toast.show('Ahora es la foto principal'),
                    onError: (err) => toast.show(getErrorMessage(err), 'error'),
                  })
                }
              >
                Marcar como principal
              </Button>
            )}
            {can(PERMISSIONS.ANIMAL_PHOTOS_DELETE) && (
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                onClick={() => {
                  remove.reset()
                  setConfirmDelete(true)
                }}
              >
                Eliminar foto
              </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar foto"
        message={
          photo.isPrimary
            ? 'Es la foto principal: la más reciente pasará a serlo. La foto se quitará del historial.'
            : 'La foto se quitará del historial del animal.'
        }
        confirmLabel="Eliminar"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(ids, {
            onSuccess: () => {
              toast.show('Foto eliminada')
              setConfirmDelete(false)
              onClose()
            },
          })
        }
      />
    </div>
  )
}

function EditPhotoForm({
  photo,
  minDate,
  onDone,
}: {
  photo: AnimalPhoto
  minDate?: string | null
  onDone(): void
}) {
  const toast = useToast()
  const update = useUpdatePhoto()
  const [description, setDescription] = useState(photo.description ?? '')
  const [takenAt, setTakenAt] = useState(photo.takenAt ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body: { description?: string | null; takenAt?: string | null } = {}
    if (description.trim() !== (photo.description ?? '')) body.description = nullable(description)
    if (takenAt !== (photo.takenAt ?? '')) body.takenAt = takenAt || null
    if (Object.keys(body).length === 0) {
      onDone()
      return
    }
    update.mutate(
      { animalId: photo.animalId, photoId: photo.id, body },
      {
        onSuccess: () => {
          toast.show('Foto actualizada')
          onDone()
        },
      },
    )
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {update.isError && <Alert tone="error">{getErrorMessage(update.error)}</Alert>}
      <TextAreaField
        label="Descripción"
        maxLength={500}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <TextField
        label="Fecha de la foto"
        type="date"
        min={minDate ?? undefined}
        max={todayIso()}
        value={takenAt}
        onChange={(e) => setTakenAt(e.target.value)}
      />
      <div className="row">
        <Button size="sm" variant="secondary" onClick={onDone} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button size="sm" type="submit" loading={update.isPending}>
          Guardar
        </Button>
      </div>
    </form>
  )
}
