import { useState, type FormEvent } from 'react'
import { animalLabel } from '@/features/animals'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { addDaysIso, todayIso } from '@/shared/lib/format'
import { Alert, Button, Dialog, TextAreaField, TextField, useToast } from '@/shared/ui'
import { useJustifyControls } from '../hooks/useControls'
import {
  CONTROL_LABELS,
  JUSTIFICATION_SUGGESTIONS,
  type ControlItem,
  type ControlType,
} from '../types/controls.types'

interface JustifyDialogProps {
  open: boolean
  type: ControlType
  /** Animales a justificar (uno o la selección). */
  items: ControlItem[]
  onClose(): void
  /** Se guardó: la página limpia la selección. */
  onJustified(): void
  /** La API rechazó estos animales (ya no tienen el control pendiente): se quitan de la selección. */
  onRejected(animalIds: string[]): void
}

export function JustifyDialog({ open, type, items, onClose, onJustified, onRejected }: JustifyDialogProps) {
  const title =
    items.length === 1 ? `Justificar ${CONTROL_LABELS[type].toLowerCase()}` : `Justificar ${items.length} controles`
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={items.length === 1 ? animalLabel(items[0]) : CONTROL_LABELS[type]}
      bare
    >
      {open && (
        <JustifyForm type={type} items={items} onClose={onClose} onJustified={onJustified} onRejected={onRejected} />
      )}
    </Dialog>
  )
}

const MIN_REASON = 5
const MAX_REASON = 500

function JustifyForm({ type, items, onClose, onJustified, onRejected }: Omit<JustifyDialogProps, 'open'>) {
  const toast = useToast()
  const justify = useJustifyControls()
  const today = todayIso()
  const [reason, setReason] = useState('')
  const [nextDueDate, setNextDueDate] = useState(addDaysIso(today, 15))
  // Solo en el destete: reprogramar o cerrar sin fecha.
  const [closeWeaning, setCloseWeaning] = useState(false)
  const [rejectedNotice, setRejectedNotice] = useState<string | null>(null)

  const isWeaning = type === 'WEANING'
  const withoutDate = isWeaning && closeWeaning
  const reasonTooShort = reason.trim().length < MIN_REASON

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (reasonTooShort || items.length === 0) return
    setRejectedNotice(null)
    justify.mutate(
      {
        type,
        animalIds: items.map((i) => i.animalId),
        reason: reason.trim(),
        nextDueDate: withoutDate ? undefined : nextDueDate,
      },
      {
        onSuccess: ({ justified }) => {
          toast.show(`${justified} ${justified === 1 ? 'control justificado' : 'controles justificados'}`)
          onJustified()
          onClose()
        },
        onError: (err) => {
          // 400 con animalIds: esos animales ya no tienen el control pendiente. No se guardó nada.
          const failed = err instanceof ApiError ? err.body.animalIds : undefined
          if (Array.isArray(failed) && failed.length > 0) {
            const ids = failed.filter((id): id is string => typeof id === 'string')
            onRejected(ids)
            justify.reset()
            const remaining = items.length - ids.length
            if (remaining <= 0) {
              toast.show('Ninguno de los animales tiene ya este control pendiente', 'info')
              onClose()
              return
            }
            setRejectedNotice(
              `${ids.length} animal(es) ya no tienen este control pendiente y se quitaron de la selección. ` +
                'Revise y vuelva a guardar.',
            )
          }
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {justify.isError && <Alert tone="error">{getErrorMessage(justify.error)}</Alert>}
        {rejectedNotice && <Alert tone="warning">{rejectedNotice}</Alert>}

        <TextAreaField
          label="Motivo"
          required
          minLength={MIN_REASON}
          maxLength={MAX_REASON}
          value={reason}
          hint={`Por qué no se hizo el control (${MIN_REASON} a ${MAX_REASON} caracteres).`}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="suggestions" aria-label="Motivos sugeridos">
          {JUSTIFICATION_SUGGESTIONS[type].map((s) => (
            <button key={s} type="button" className="suggestion" onClick={() => setReason(s)}>
              {s}
            </button>
          ))}
        </div>

        {isWeaning && (
          <div className="stack stack--sm" role="radiogroup" aria-label="Qué hacer con el destete">
            <label className="choice row" style={{ gap: 10 }}>
              <input type="radio" name="weaning-mode" checked={!closeWeaning} onChange={() => setCloseWeaning(false)} />
              <strong>Reprogramar a otra fecha</strong>
            </label>
            <label className="choice row" style={{ gap: 10 }}>
              <input type="radio" name="weaning-mode" checked={closeWeaning} onChange={() => setCloseWeaning(true)} />
              <strong>Cerrar el destete {items.length === 1 ? 'de este animal' : 'de estos animales'}</strong>
            </label>
          </div>
        )}

        {withoutDate ? (
          <Alert tone="warning">
            {items.length === 1 ? 'El animal dejará' : 'Los animales dejarán'} de aparecer en Destete. Use esta opción
            si ya se destetó o no corresponde destetarlo.
          </Alert>
        ) : (
          <TextField
            label="Nueva fecha del control"
            type="date"
            required
            min={addDaysIso(today, 1)}
            max={addDaysIso(today, 365)}
            value={nextDueDate}
            hint="Posterior a hoy y a menos de un año."
            onChange={(e) => setNextDueDate(e.target.value)}
          />
        )}
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onClose} disabled={justify.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={justify.isPending} disabled={reasonTooShort || items.length === 0}>
          {withoutDate ? 'Cerrar destete' : 'Justificar'}
        </Button>
      </footer>
    </form>
  )
}
