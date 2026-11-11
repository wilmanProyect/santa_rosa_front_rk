import { useState } from 'react'
import { Can } from '@/features/auth'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { formatBytes, formatDateTime } from '@/shared/lib/format'
import { Alert, Button, PageHeader, useToast } from '@/shared/ui'
import { PERMISSIONS } from '@/shared/config/permissions'
import { backupsApi } from '../api/backups.api'
import { RestoreSection } from '../components/RestoreSection'

interface LastBackup {
  fileName: string
  size: number
  at: Date
}

/**
 * Descarga de la copia de seguridad completa y, con `backups:restore`, su
 * restauración (en dos pasos, con confirmación).
 */
export function BackupsPage() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<LastBackup | null>(null)

  async function download() {
    setBusy(true)
    setError(null)
    try {
      const { blob, fileName } = await backupsApi.download()
      const name = fileName ?? 'santa-rosa-respaldo.tar.gz'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setLast({ fileName: name, size: blob.size, at: new Date() })
      toast.show('Copia de seguridad descargada')
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'Ya se está generando una copia de seguridad. Espere a que termine y vuelva a intentarlo.'
          : getErrorMessage(err),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Copias de seguridad"
        description="Descargue una copia completa del sistema (la base de datos y todas las fotos y certificados) o restaure una anterior."
      />

      <div className="form-sections">
        <Alert tone="warning">
          El archivo contiene <strong>datos reales y confidenciales</strong> (usuarios, animales, registro
          sanitario). Guárdelo en un lugar seguro, fuera del servidor.
        </Alert>
        {error && <Alert tone="error">{error}</Alert>}

        <section className="card">
          <header className="card__header">
            <div>
              <h2>Descargar copia de seguridad</h2>
              <p>
                Puede tardar unos minutos y, con muchas fotos, pesar cientos de MB. No cierre esta pestaña
                hasta que termine la descarga.
              </p>
            </div>
          </header>
          <div className="card__body stack">
            <div>
              <Button icon="download" loading={busy} onClick={() => void download()}>
                {busy ? 'Generando copia de seguridad...' : 'Descargar copia de seguridad'}
              </Button>
            </div>
            {last && (
              <p className="muted small m-0">
                Última descarga en esta sesión: <span className="mono">{last.fileName}</span> (
                {formatBytes(last.size)}), {formatDateTime(last.at.toISOString())}.
              </p>
            )}
          </div>
        </section>

        <Can permissions={[PERMISSIONS.BACKUPS_RESTORE]}>
          <RestoreSection />
        </Can>
      </div>
    </>
  )
}
