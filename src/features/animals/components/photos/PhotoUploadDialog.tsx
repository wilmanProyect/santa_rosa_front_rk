import { useRef, useState } from 'react'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { formatBytes, todayIso } from '@/shared/lib/format'
import { Badge, Button, Dialog, Icon, TextField } from '@/shared/ui'
import { photosApi } from '../../api/animals.api'
import { usePhotosInvalidation } from '../../hooks/usePhotos'
import { convertHeicToJpeg, isHeic, validatePhoto } from '../../lib/image-files'
import { ANIMAL_ERROR_CODES, FILE_LIMITS } from '../../types/animal.types'

type UploadState = 'converting' | 'pending' | 'uploading' | 'done' | 'error' | 'duplicate'

interface UploadItem {
  key: string
  file: File
  preview: string
  description: string
  state: UploadState
  progress: number
  error?: string
  /** La foto era HEIC y se convirtió a JPG en el navegador. */
  converted?: boolean
  /** Foto existente cuando el backend responde DUPLICATE_PHOTO. */
  duplicateOf?: string
}

interface PhotoUploadDialogProps {
  open: boolean
  animalId: string
  /** Fecha mínima de la foto (nacimiento del animal). */
  minDate?: string | null
  onClose(): void
  onShowPhoto(photoId: string): void
}

/** Subida de varias fotos, una tras otra; que una falle no detiene las demás. */
export function PhotoUploadDialog({ open, animalId, minDate, onClose, onShowPhoto }: PhotoUploadDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const invalidate = usePhotosInvalidation()
  const [items, setItems] = useState<UploadItem[]>([])
  const [takenAt, setTakenAt] = useState('')
  const [running, setRunning] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  /** Al cerrar se liberan las vistas previas (URL de objeto) y se vacía la lista. */
  function close() {
    if (running) return
    items.forEach((item) => URL.revokeObjectURL(item.preview))
    setItems([])
    setTakenAt('')
    onClose()
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    const next: UploadItem[] = [...files].map((file) => {
      const base = {
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        // El navegador no sabe mostrar HEIC: la vista previa se crea después de convertirla.
        preview: isHeic(file) ? '' : URL.createObjectURL(file),
        description: '',
        progress: 0,
      }
      if (isHeic(file)) return { ...base, state: 'converting' }
      const problem = validatePhoto(file)
      return problem ? { ...base, state: 'error', error: problem } : { ...base, state: 'pending' }
    })
    setItems((current) => [...current, ...next])
    next.filter((item) => item.state === 'converting').forEach((item) => void convert(item))
  }

  /** Las fotos de iPhone (HEIC) se convierten a JPG antes de subirlas: el backend no las acepta. */
  async function convert(item: UploadItem) {
    try {
      const jpeg = await convertHeicToJpeg(item.file)
      const problem = validatePhoto(jpeg)
      patch(item.key, {
        file: jpeg,
        preview: URL.createObjectURL(jpeg),
        converted: true,
        ...(problem ? { state: 'error', error: problem } : { state: 'pending' }),
      })
    } catch {
      patch(item.key, {
        state: 'error',
        error: 'No se pudo convertir la foto HEIC. Configure la cámara del iPhone en "Más compatible".',
      })
    }
  }

  function patch(key: string, changes: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...changes } : item)))
  }

  async function uploadAll() {
    setRunning(true)
    for (const item of items.filter((i) => i.state === 'pending')) {
      patch(item.key, { state: 'uploading', progress: 0 })
      try {
        await photosApi.upload(
          animalId,
          { file: item.file, description: item.description.trim() || undefined, takenAt: takenAt || undefined },
          (progress) => patch(item.key, { progress }),
        )
        patch(item.key, { state: 'done', progress: 1 })
      } catch (err) {
        if (err instanceof ApiError && err.code === ANIMAL_ERROR_CODES.DUPLICATE_PHOTO) {
          patch(item.key, {
            state: 'duplicate',
            error: 'Esta foto ya está en el historial',
            duplicateOf: typeof err.body.photoId === 'string' ? err.body.photoId : undefined,
          })
        } else if (err instanceof ApiError && err.status === 413) {
          patch(item.key, { state: 'error', error: 'La foto supera los 15 MB' })
        } else {
          patch(item.key, { state: 'error', error: getErrorMessage(err) })
        }
      }
    }
    setRunning(false)
    await invalidate(animalId)
  }

  const pending = items.filter((i) => i.state === 'pending').length
  const converting = items.some((i) => i.state === 'converting')
  const finished = items.length > 0 && pending === 0 && !running

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Subir fotos"
      description="JPG, PNG o WEBP de hasta 15 MB. Las fotos HEIC de iPhone se convierten a JPG automáticamente. Si no indica la fecha, se usa la de la cámara."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={running}>
            {finished ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button icon="upload" onClick={() => void uploadAll()} disabled={pending === 0 || converting} loading={running}>
            {pending > 1 ? `Subir ${pending} fotos` : 'Subir foto'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <button
          type="button"
          className={`dropzone${dragOver ? ' is-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            addFiles(e.dataTransfer.files)
          }}
          disabled={running}
        >
          <Icon name="camera" size={32} />
          <strong>Elegir fotos o arrastrarlas aquí</strong>
          <span className="small">Puede seleccionar varias a la vez.</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept={[...FILE_LIMITS.photoTypes, 'image/heic', 'image/heif', '.heic', '.heif'].join(',')}
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {items.length > 0 && (
          <>
            <TextField
              label="Fecha de las fotos"
              hint="Opcional. Se aplica a todas las fotos de esta subida."
              type="date"
              min={minDate ?? undefined}
              max={todayIso()}
              value={takenAt}
              disabled={running}
              onChange={(e) => setTakenAt(e.target.value)}
            />
            <ul className="upload-list">
              {items.map((item) => (
                <li key={item.key} className="upload-item">
                  {item.preview ? (
                    <img src={item.preview} alt="" />
                  ) : (
                    <span className="upload-item__placeholder">
                      <Icon name="image" />
                    </span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <strong className="truncate">{item.file.name}</strong>
                      <span className="muted small">{formatBytes(item.file.size)}</span>
                      {item.converted && <Badge tone="info">Convertida de HEIC</Badge>}
                    </div>
                    {item.state === 'pending' ? (
                      <input
                        className="input"
                        style={{ minHeight: 32, marginTop: 4, padding: '4px 10px' }}
                        placeholder="Descripción (opcional)"
                        aria-label={`Descripción de ${item.file.name}`}
                        maxLength={500}
                        value={item.description}
                        onChange={(e) => patch(item.key, { description: e.target.value })}
                      />
                    ) : item.state === 'uploading' ? (
                      <div className="progress" role="progressbar" aria-valuenow={Math.round(item.progress * 100)}>
                        <span style={{ width: `${item.progress * 100}%` }} />
                      </div>
                    ) : item.error ? (
                      <div className="small" style={{ color: 'var(--color-danger)' }}>
                        {item.error}
                        {item.duplicateOf && (
                          <>
                            {' · '}
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => onShowPhoto(item.duplicateOf!)}
                            >
                              Ver foto existente
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <StateBadge item={item} onRemove={() => {
                      URL.revokeObjectURL(item.preview)
                      setItems((c) => c.filter((i) => i.key !== item.key))
                    }} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Dialog>
  )
}

function StateBadge({ item, onRemove }: { item: UploadItem; onRemove(): void }) {
  switch (item.state) {
    case 'pending':
      return (
        <button type="button" className="icon-btn" aria-label="Quitar de la lista" title="Quitar" onClick={onRemove}>
          <Icon name="close" size={16} />
        </button>
      )
    case 'converting':
      return <Badge tone="neutral">Convirtiendo…</Badge>
    case 'uploading':
      return <Badge tone="info">{Math.round(item.progress * 100)} %</Badge>
    case 'done':
      return <Badge tone="success">Lista</Badge>
    case 'duplicate':
      return <Badge tone="warning">Repetida</Badge>
    default:
      return <Badge tone="danger">Error</Badge>
  }
}
