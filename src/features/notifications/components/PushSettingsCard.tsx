import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Badge, Button, useToast } from '@/shared/ui'
import { disablePush, enablePush, getPushStatus, sendTestPush, type PushStatus } from '../lib/push'

const STATUS_BADGE: Record<PushStatus, { tone: 'success' | 'neutral' | 'danger' | 'warning'; label: string }> = {
  enabled: { tone: 'success', label: 'Activadas' },
  disabled: { tone: 'neutral', label: 'Desactivadas' },
  denied: { tone: 'danger', label: 'Bloqueadas' },
  unsupported: { tone: 'warning', label: 'No disponibles' },
}

/** "Notificaciones en este dispositivo": activar o desactivar los push del navegador. */
export function PushSettingsCard() {
  const toast = useToast()
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState<'toggle' | 'test' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPushStatus()
      .then((s) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatus('unsupported'))
    return () => {
      cancelled = true
    }
  }, [])

  async function run(kind: 'toggle' | 'test', action: () => Promise<void>) {
    setBusy(kind)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error && !('status' in err) ? err.message : getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  // Se pide el permiso solo al tocar el botón: los navegadores bloquean los pedidos automáticos.
  const enable = () =>
    run('toggle', async () => {
      const next = await enablePush()
      setStatus(next)
      if (next === 'enabled') toast.show('Notificaciones activadas en este dispositivo')
    })

  const disable = () =>
    run('toggle', async () => {
      await disablePush()
      setStatus(await getPushStatus())
      toast.show('Notificaciones desactivadas en este dispositivo')
    })

  const test = () =>
    run('test', async () => {
      const { sent } = await sendTestPush()
      toast.show(sent > 0 ? 'Notificación de prueba enviada' : 'No se pudo enviar la prueba', sent > 0 ? 'success' : 'info')
    })

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Notificaciones en este dispositivo</h2>
          <p>Avisos de partos y controles aunque la página esté cerrada.</p>
        </div>
        {status && <Badge tone={STATUS_BADGE[status].tone}>{STATUS_BADGE[status].label}</Badge>}
      </header>
      <div className="card__body stack">
        {error && <Alert tone="error">{error}</Alert>}
        {status === 'denied' && (
          <Alert tone="warning">
            El navegador bloqueó las notificaciones de este sitio. Para habilitarlas, toque el candado junto a la
            dirección de la página, permita las <strong>Notificaciones</strong> y recargue.
          </Alert>
        )}
        {status === 'unsupported' && (
          <Alert tone="info">
            Este navegador no admite notificaciones push. Use Chrome, Edge o Firefox. En iPhone o iPad, primero agregue
            la página a la pantalla de inicio (iOS 16.4 o posterior).
          </Alert>
        )}
        {status === 'disabled' && (
          <p className="m-0 muted">
            Al activarlas, el navegador le pedirá permiso. Se activan solo en este dispositivo y navegador.
          </p>
        )}
        {(status === 'enabled' || status === 'disabled') && (
          <div className="row">
            {status === 'enabled' ? (
              <>
                <Button variant="secondary" loading={busy === 'toggle'} disabled={busy !== null} onClick={disable}>
                  Desactivar
                </Button>
                <Button variant="secondary" icon="bell" loading={busy === 'test'} disabled={busy !== null} onClick={test}>
                  Enviar prueba
                </Button>
              </>
            ) : (
              <Button icon="bell" loading={busy === 'toggle'} disabled={busy !== null} onClick={enable}>
                Activar notificaciones
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
