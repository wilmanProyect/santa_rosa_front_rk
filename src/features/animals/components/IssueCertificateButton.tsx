import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { Button, Icon, useToast } from '@/shared/ui'
import { animalsApi } from '../api/animals.api'
import type { AnimalDetail } from '../types/animal.types'

/**
 * Emite el certificado del animal (PDF generado por el backend). Cada emisión lleva un
 * número nuevo y los datos vigentes; no se guarda, así que se puede volver a emitir.
 */
export function IssueCertificateButton({ animal }: { animal: AnimalDetail }) {
  const toast = useToast()
  const [busy, setBusy] = useState<'open' | 'download' | null>(null)

  async function issue(mode: 'open' | 'download') {
    // La pestaña se abre antes de la descarga para que el navegador no la bloquee.
    const win = mode === 'open' ? window.open('', '_blank') : null
    setBusy(mode)
    try {
      const { blob, fileName, number } = await animalsApi.issueCertificate(animal.id, mode === 'download')
      const url = URL.createObjectURL(blob)
      if (mode === 'open') {
        if (win) win.location.href = url
        else window.open(url, '_blank')
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = fileName ?? `certificado-${animal.earTag ?? animal.id}.pdf`
        document.body.appendChild(link)
        link.click()
        link.remove()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      toast.show(number ? `Certificado ${number} emitido` : 'Certificado emitido')
    } catch (err) {
      win?.close()
      toast.show(getErrorMessage(err), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <span className="button-group">
      <Button
        variant="secondary"
        icon="file"
        loading={busy === 'open'}
        disabled={busy !== null}
        onClick={() => void issue('open')}
        title="Genera el PDF con toda la información del animal y lo abre en una pestaña nueva"
      >
        Certificado
      </Button>
      <button
        type="button"
        className="btn btn--secondary button-group__icon"
        aria-label="Descargar certificado"
        title="Descargar certificado"
        disabled={busy !== null}
        onClick={() => void issue('download')}
      >
        {busy === 'download' ? <span className="btn__spinner" aria-hidden="true" /> : <Icon name="download" />}
      </button>
    </span>
  )
}
