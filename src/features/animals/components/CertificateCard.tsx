import { useRef, useState } from 'react'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatBytes, formatDateTime } from '@/shared/lib/format'
import { Button, ConfirmDialog, DataItem, useToast } from '@/shared/ui'
import { animalsApi } from '../api/animals.api'
import { useRemoveCertificate, useUploadCertificate } from '../hooks/useAnimals'
import { validateCertificate } from '../lib/image-files'
import { FILE_LIMITS, type AnimalDetail } from '../types/animal.types'

/** Código y archivo escaneado del certificado ABSID. */
export function CertificateCard({ animal }: { animal: AnimalDetail }) {
  const { can } = useAuth()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadCertificate()
  const remove = useRemoveCertificate()
  const [opening, setOpening] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const canEdit = can(PERMISSIONS.ANIMALS_UPDATE)
  const file = animal.certificateFile

  function pick(selected: File | undefined) {
    if (!selected) return
    const problem = validateCertificate(selected)
    if (problem) {
      toast.show(problem, 'error')
      return
    }
    uploadMutation.mutate(
      { id: animal.id, file: selected },
      {
        onSuccess: () => toast.show(file ? 'Certificado reemplazado' : 'Certificado adjuntado'),
        onError: (err) => toast.show(getErrorMessage(err), 'error'),
      },
    )
  }

  /** El endpoint exige el token, así que se descarga con fetch y se abre como blob. */
  async function open() {
    // La ventana se abre antes de la descarga para que el navegador no la bloquee.
    const win = window.open('', '_blank')
    setOpening(true)
    try {
      const blob = await animalsApi.certificate(animal.id)
      const url = URL.createObjectURL(blob)
      if (win) win.location.href = url
      else window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      win?.close()
      toast.show(getErrorMessage(err), 'error')
    } finally {
      setOpening(false)
    }
  }

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Certificado ABSID</h2>
          <p>PDF, JPG, PNG o WEBP de hasta 10 MB.</p>
        </div>
        <div className="row">
          {file && (
            <Button variant="secondary" size="sm" icon="file" loading={opening} onClick={() => void open()}>
              Ver certificado
            </Button>
          )}
          {canEdit && (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon="upload"
                loading={uploadMutation.isPending}
                onClick={() => inputRef.current?.click()}
              >
                {file ? 'Reemplazar' : 'Adjuntar archivo'}
              </Button>
              {file && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="trash"
                  onClick={() => {
                    remove.reset()
                    setConfirmRemove(true)
                  }}
                >
                  Quitar
                </Button>
              )}
              <input
                ref={inputRef}
                type="file"
                hidden
                accept={FILE_LIMITS.certificateTypes.join(',')}
                onChange={(e) => {
                  pick(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
      </header>
      <div className="card__body">
        <dl className="data-list">
          <DataItem label="Código del certificado" value={animal.absidCertificateCode} />
          <DataItem label="Archivo" value={file?.fileName} />
          <DataItem label="Tamaño" value={file && formatBytes(file.sizeBytes)} />
          <DataItem label="Subido" value={file && formatDateTime(file.uploadedAt)} />
        </dl>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Quitar certificado"
        message="Se quitará el archivo escaneado. El código del certificado se conserva."
        confirmLabel="Quitar archivo"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() =>
          remove.mutate(animal.id, {
            onSuccess: () => {
              toast.show('Certificado quitado')
              setConfirmRemove(false)
            },
          })
        }
      />
    </section>
  )
}
