import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Dialog, Icon, TextAreaField } from '@/shared/ui'
import { animalLabel } from '../lib/animal-label'
import { ANIMALS_ROUTES } from '../routes'
import type { DuplicateIdentifierBody } from '../types/animal.types'

const FIELD_LABELS = { earTag: 'arete', absidRegistry: 'registro ABSID' } as const

interface DuplicateIdentifierAlertProps {
  conflict: DuplicateIdentifierBody
  /** Solo si el backend lo permite (DUPLICATE_IDENTIFIER, no DUPLICATE_EAR_TAG_AND_ABSID). */
  onRegisterException?(): void
}

/** Explica el arete/ABSID repetido, enlaza a los animales en conflicto y ofrece el caso especial. */
export function DuplicateIdentifierAlert({ conflict, onRegisterException }: DuplicateIdentifierAlertProps) {
  const canBeException = conflict.code === 'DUPLICATE_IDENTIFIER'
  const fields = conflict.fields.map((f) => FIELD_LABELS[f]).join(' y ')

  return (
    <Alert tone={canBeException ? 'warning' : 'error'}>
      <div className="stack stack--sm">
        <strong>{conflict.message}</strong>
        <span>
          {canBeException
            ? `El ${fields} ya lo tiene otro animal. Si así figura en la planilla de la cabaña, regístrelo como caso especial.`
            : 'El arete y el registro ABSID coinciden con otro animal: probablemente es el mismo animal cargado dos veces.'}
        </span>
        <ul className="m-0" style={{ paddingLeft: 18 }}>
          {conflict.conflicts.map((animal) => (
            <li key={animal.id}>
              <Link to={ANIMALS_ROUTES.detail(animal.id)} target="_blank" rel="noreferrer">
                {animalLabel(animal)}
                {animal.absidRegistry && ` · ABSID ${animal.absidRegistry}`}
                {animal.isExternal && ' (externo)'} <Icon name="external" size={12} />
              </Link>
            </li>
          ))}
        </ul>
        {canBeException && onRegisterException && (
          <div>
            <Button variant="accent" size="sm" icon="alert" onClick={onRegisterException}>
              Registrar como caso especial
            </Button>
          </div>
        )}
      </div>
    </Alert>
  )
}

interface ExceptionReasonDialogProps {
  open: boolean
  loading: boolean
  description?: string
  defaultReason?: string
  onClose(): void
  onConfirm(reason: string): void
}

/** Pide el motivo obligatorio del caso especial antes de reintentar el guardado. */
export function ExceptionReasonDialog({
  open,
  loading,
  description,
  defaultReason,
  onClose,
  onConfirm,
}: ExceptionReasonDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar como caso especial"
      description={
        description ??
        'El identificador repetido se conservará tal cual y el animal quedará marcado para revisión.'
      }
      size="sm"
      bare
    >
      <ReasonForm
        key={defaultReason ?? 'duplicate'}
        loading={loading}
        defaultReason={defaultReason}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </Dialog>
  )
}

function ReasonForm({
  loading,
  defaultReason = 'Registrado así en la planilla de la cabaña',
  onClose,
  onConfirm,
}: Omit<ExceptionReasonDialogProps, 'open' | 'description'>) {
  const [reason, setReason] = useState(defaultReason)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onConfirm(reason.trim())
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        <TextAreaField
          label="Motivo"
          required
          maxLength={500}
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" loading={loading}>
          Guardar como caso especial
        </Button>
      </footer>
    </form>
  )
}
