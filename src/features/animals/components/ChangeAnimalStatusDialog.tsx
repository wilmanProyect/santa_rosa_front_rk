import { useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDate, optional, todayIso } from '@/shared/lib/format'
import { Alert, Button, Dialog, SelectField, TextAreaField, TextField, useToast } from '@/shared/ui'
import { useChangeAnimalStatus } from '../hooks/useAnimals'
import { animalLabel } from '../lib/animal-label'
import {
  ANIMAL_ERROR_CODES,
  ANIMAL_STATUS_LABELS,
  type AnimalDetail,
  type AnimalStatus,
  type WithdrawalInfo,
} from '../types/animal.types'

type ExitStatus = Exclude<AnimalStatus, 'ALIVE'>

/** Salidas del inventario: no son borrados, son cambios de estado. */
const EXIT_STATUSES: ExitStatus[] = ['DEAD', 'SOLD', 'SLAUGHTERED', 'GIFTED', 'EXCHANGED']

const REASON_HINT: Record<ExitStatus, string> = {
  DEAD: 'Causa de la muerte',
  SOLD: 'Comprador, precio u otros datos de la venta',
  SLAUGHTERED: 'Destino o detalle de la faena',
  GIFTED: 'A quién se regaló',
  EXCHANGED: 'Con quién y por qué animal se intercambió',
}

interface ChangeAnimalStatusDialogProps {
  open: boolean
  animal: AnimalDetail
  onClose(): void
}

/** Registrar la salida de un animal vivo, o corregir una salida y volverlo a "Vivo". */
export function ChangeAnimalStatusDialog({ open, animal, onClose }: ChangeAnimalStatusDialogProps) {
  const exiting = animal.status === 'ALIVE'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={exiting ? 'Registrar salida' : 'Corregir: volver a Vivo'}
      description={animalLabel(animal)}
      size="sm"
      bare
    >
      <StatusForm key={`${animal.id}-${animal.status}`} animal={animal} onDone={onClose} />
    </Dialog>
  )
}

function StatusForm({ animal, onDone }: { animal: AnimalDetail; onDone(): void }) {
  const toast = useToast()
  const { can } = useAuth()
  const mutation = useChangeAnimalStatus()
  const exiting = animal.status === 'ALIVE'
  const canOverride = can(PERMISSIONS.HEALTH_OVERRIDE_WITHDRAWAL)

  const [status, setStatus] = useState<ExitStatus>('SOLD')
  const [date, setDate] = useState(todayIso())
  const [reason, setReason] = useState('')
  const [override, setOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  // Retiro informado por el backend al bloquear una faena (puede diferir del de la ficha).
  const [blocked, setBlocked] = useState<WithdrawalInfo | null>(null)

  // La fecha no puede ser anterior al nacimiento ni al ingreso.
  const minDate = [animal.birthDate, animal.entryDate].filter(Boolean).sort().pop() ?? undefined
  const meatWithdrawal = blocked ?? animal.withdrawal?.meat ?? null
  const slaughterInWithdrawal = status === 'SLAUGHTERED' && meatWithdrawal !== null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body = exiting
      ? {
          status,
          date,
          reason: optional(reason),
          ...(status === 'SLAUGHTERED' && override
            ? { overrideWithdrawal: true, overrideReason: overrideReason.trim() }
            : {}),
        }
      : { status: 'ALIVE' as const }

    mutation.mutate(
      { id: animal.id, body },
      {
        onSuccess: (result) => {
          toast.show(exiting ? `Salida registrada: ${ANIMAL_STATUS_LABELS[status]}` : 'El animal volvió a Vivo')
          // Avisos que no impidieron el cambio (p. ej. venta en período de retiro).
          result.warnings?.forEach((warning) => toast.show(warning, 'info'))
          onDone()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === ANIMAL_ERROR_CODES.WITHDRAWAL_PERIOD) {
            const withdrawal = err.body.withdrawal as WithdrawalInfo | undefined
            if (withdrawal) setBlocked(withdrawal)
          }
        },
      },
    )
  }

  const isWithdrawalError =
    mutation.error instanceof ApiError && mutation.error.code === ANIMAL_ERROR_CODES.WITHDRAWAL_PERIOD

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {mutation.isError && !isWithdrawalError && (
          <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>
        )}
        {exiting ? (
          <>
            <SelectField
              label="Tipo de salida"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value as ExitStatus)}
            >
              {EXIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ANIMAL_STATUS_LABELS[s]}
                </option>
              ))}
            </SelectField>

            {slaughterInWithdrawal && meatWithdrawal && (
              <Alert tone={canOverride ? 'warning' : 'error'}>
                <strong>Período de retiro vigente.</strong> Se aplicó {meatWithdrawal.productName} el{' '}
                {formatDate(meatWithdrawal.appliedAt)}: no se puede faenar hasta el{' '}
                <strong>{formatDate(meatWithdrawal.endsOn)}</strong>.
                {!canOverride && ' Solo un usuario autorizado puede forzar la faena.'}
              </Alert>
            )}
            {status === 'SOLD' && animal.withdrawal?.meat && (
              <Alert tone="info">
                El animal está en período de retiro hasta el {formatDate(animal.withdrawal.meat.endsOn)}.
                Se puede vender (p. ej. en pie para reproducción), pero no faenar.
              </Alert>
            )}

            <TextField
              label="Fecha"
              type="date"
              required
              min={minDate}
              max={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextAreaField
              label="Motivo o detalle"
              hint={REASON_HINT[status]}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            {slaughterInWithdrawal && canOverride && (
              <div className="stack stack--sm">
                <label className="checkbox">
                  <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                  <span>Autorizo la faena aunque el animal esté en período de retiro</span>
                </label>
                {override && (
                  <TextAreaField
                    label="Motivo de la autorización"
                    required
                    maxLength={300}
                    hint="Queda escrito en el registro de la salida."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          <p className="m-0">
            El animal volverá al inventario como <strong>Vivo</strong> y se borrarán la fecha y el
            motivo de la salida ({ANIMAL_STATUS_LABELS[animal.status].toLowerCase()}).
          </p>
        )}
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={exiting ? 'danger' : 'primary'}
          loading={mutation.isPending}
          // Faena bloqueada por retiro: solo se habilita si quien puede autorizar lo marca.
          disabled={slaughterInWithdrawal && !override}
        >
          {exiting ? 'Registrar salida' : 'Volver a Vivo'}
        </Button>
      </footer>
    </form>
  )
}
