import { useState, type FormEvent } from 'react'
import { Alert, Button, Dialog, TextAreaField } from '@/shared/ui'
import type { KinshipDetail } from '../types/reproduction.types'
import { KinshipDetails } from './KinshipDetails'

const MIN_REASON = 10
const MAX_REASON = 500

interface OverrideKinshipDialogProps {
  open: boolean
  kinship: KinshipDetail | null
  loading: boolean
  error?: string | null
  onClose(): void
  onConfirm(reason: string): void
}

/** Autorizar una monta entre parientes: exige una justificación de 10 a 500 caracteres. */
export function OverrideKinshipDialog({ open, kinship, loading, error, onClose, onConfirm }: OverrideKinshipDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Autorizar monta entre parientes"
      description="La monta guardará la justificación, quién la autorizó y cuándo."
      bare
    >
      <OverrideForm kinship={kinship} loading={loading} error={error} onClose={onClose} onConfirm={onConfirm} />
    </Dialog>
  )
}

function OverrideForm({ kinship, loading, error, onClose, onConfirm }: Omit<OverrideKinshipDialogProps, 'open'>) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const trimmed = reason.trim()
  const invalid = trimmed.length < MIN_REASON

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!invalid) onConfirm(trimmed)
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {error && <Alert tone="error">{error}</Alert>}
        {kinship && (
          <Alert tone="warning">
            <KinshipDetails kinship={kinship} />
          </Alert>
        )}
        <TextAreaField
          label="Justificación"
          required
          minLength={MIN_REASON}
          maxLength={MAX_REASON}
          rows={4}
          value={reason}
          hint={`De ${MIN_REASON} a ${MAX_REASON} caracteres (${trimmed.length}/${MAX_REASON}).`}
          className={touched && invalid ? 'field--invalid' : undefined}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" loading={loading}>
          Autorizar y registrar
        </Button>
      </footer>
    </form>
  )
}
