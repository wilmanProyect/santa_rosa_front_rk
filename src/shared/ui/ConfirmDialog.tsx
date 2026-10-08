import type { ReactNode } from 'react'
import { Alert } from './Alert'
import { Button } from './Button'
import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  error?: string | null
  onConfirm(): void
  onClose(): void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  tone = 'danger',
  loading = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="stack">
        {error && <Alert tone="error">{error}</Alert>}
        <p className="m-0">{message}</p>
      </div>
    </Dialog>
  )
}
