import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { nullable, optional, todayIso } from '@/shared/lib/format'
import { Alert, Button, Dialog, SelectField, TextAreaField, TextField, useToast } from '@/shared/ui'
import {
  useAddPregnancyCheck,
  useRecordAbortion,
  useUpdateBreedingService,
} from '../hooks/useReproduction'
import {
  MAX_LITTER_SIZE,
  PREGNANCY_CHECK_METHOD_LABELS,
  PREGNANCY_CHECK_RESULT_LABELS,
  SERVICE_STATUS_LABELS,
  type BreedingService,
  type PregnancyCheckMethod,
  type PregnancyCheckResult,
  type UpdateBreedingServiceRequest,
} from '../types/reproduction.types'

interface ServiceDialogProps {
  open: boolean
  service: BreedingService
  onClose(): void
}

// ---------- Diagnóstico de preñez ----------
export function PregnancyCheckDialog({ open, service, onClose }: ServiceDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Registrar diagnóstico de preñez" bare>
      <PregnancyCheckForm service={service} onDone={onClose} />
    </Dialog>
  )
}

function PregnancyCheckForm({ service, onDone }: { service: BreedingService; onDone(): void }) {
  const toast = useToast()
  const add = useAddPregnancyCheck()
  const [checkedAt, setCheckedAt] = useState(todayIso())
  const [method, setMethod] = useState<PregnancyCheckMethod>('ULTRASOUND')
  const [result, setResult] = useState<PregnancyCheckResult>('PREGNANT')
  const [fetusCount, setFetusCount] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    add.mutate(
      {
        serviceId: service.id,
        body: {
          checkedAt,
          method,
          result,
          fetusCount: result === 'PREGNANT' && fetusCount ? Number(fetusCount) : undefined,
          notes: optional(notes),
        },
      },
      {
        onSuccess: ({ service: updated }) => {
          toast.show(`Diagnóstico registrado: ${SERVICE_STATUS_LABELS[updated.status]}`)
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {add.isError && <Alert tone="error">{getErrorMessage(add.error)}</Alert>}
        <div className="grid-2">
          <TextField
            label="Fecha"
            type="date"
            required
            min={service.serviceDate}
            max={todayIso()}
            value={checkedAt}
            onChange={(e) => setCheckedAt(e.target.value)}
          />
          <SelectField
            label="Método"
            value={method}
            onChange={(e) => setMethod(e.target.value as PregnancyCheckMethod)}
          >
            {(Object.keys(PREGNANCY_CHECK_METHOD_LABELS) as PregnancyCheckMethod[]).map((m) => (
              <option key={m} value={m}>
                {PREGNANCY_CHECK_METHOD_LABELS[m]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="segmented-choice" role="radiogroup" aria-label="Resultado">
          {(Object.keys(PREGNANCY_CHECK_RESULT_LABELS) as PregnancyCheckResult[]).map((r) => (
            <label key={r} className="choice">
              <input type="radio" name="result" checked={result === r} onChange={() => setResult(r)} />{' '}
              <strong>{PREGNANCY_CHECK_RESULT_LABELS[r]}</strong>
            </label>
          ))}
        </div>
        {result === 'PREGNANT' && (
          <SelectField
            label="Número de fetos"
            hint="Opcional: si la ecografía los contó. Se usa para precargar las crías del parto."
            value={fetusCount}
            onChange={(e) => setFetusCount(e.target.value)}
          >
            <option value="">Sin contar</option>
            {Array.from({ length: MAX_LITTER_SIZE }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
        )}
        <TextAreaField label="Observaciones" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={add.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={add.isPending}>
          Registrar diagnóstico
        </Button>
      </footer>
    </form>
  )
}

// ---------- Aborto ----------
export function AbortionDialog({ open, service, onClose }: ServiceDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Registrar aborto" size="sm" bare>
      <AbortionForm service={service} onDone={onClose} />
    </Dialog>
  )
}

function AbortionForm({ service, onDone }: { service: BreedingService; onDone(): void }) {
  const toast = useToast()
  const record = useRecordAbortion()
  const [date, setDate] = useState(todayIso())
  const [cause, setCause] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    record.mutate(
      { serviceId: service.id, body: { date, cause: optional(cause) } },
      {
        onSuccess: () => {
          toast.show('Aborto registrado')
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {record.isError && <Alert tone="error">{getErrorMessage(record.error)}</Alert>}
        <TextField
          label="Fecha"
          type="date"
          required
          min={service.serviceDate}
          max={todayIso()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextAreaField label="Causa" maxLength={500} value={cause} onChange={(e) => setCause(e.target.value)} />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={record.isPending}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" loading={record.isPending}>
          Registrar aborto
        </Button>
      </footer>
    </form>
  )
}

// ---------- Editar ----------
export function EditServiceDialog({ open, service, onClose }: ServiceDialogProps) {
  const closed = service.status === 'BIRTHED' || service.status === 'ABORTED'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={closed ? 'Editar observaciones' : 'Editar monta'}
      description="La pareja y el tipo no cambian: si están mal, elimine la monta y regístrela de nuevo."
      bare
    >
      <EditServiceForm service={service} closed={closed} onDone={onClose} />
    </Dialog>
  )
}

function EditServiceForm({ service, closed, onDone }: { service: BreedingService; closed: boolean; onDone(): void }) {
  const toast = useToast()
  const update = useUpdateBreedingService()
  const [serviceDate, setServiceDate] = useState(service.serviceDate)
  const [strawCode, setStrawCode] = useState(service.strawCode ?? '')
  const [performedBy, setPerformedBy] = useState(service.performedBy ?? '')
  const [notes, setNotes] = useState(service.notes ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body: UpdateBreedingServiceRequest = {}
    if (!closed && serviceDate !== service.serviceDate) body.serviceDate = serviceDate
    if (nullable(strawCode) !== service.strawCode) body.strawCode = nullable(strawCode)
    if (nullable(performedBy) !== service.performedBy) body.performedBy = nullable(performedBy)
    if (nullable(notes) !== service.notes) body.notes = nullable(notes)
    if (Object.keys(body).length === 0) {
      onDone()
      return
    }
    update.mutate(
      { id: service.id, body },
      {
        onSuccess: () => {
          toast.show('Monta actualizada')
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {update.isError && <Alert tone="error">{getErrorMessage(update.error)}</Alert>}
        {!closed && (
          <TextField
            label="Fecha de la monta"
            type="date"
            required
            max={todayIso()}
            value={serviceDate}
            hint="La fecha probable de parto se recalcula."
            onChange={(e) => setServiceDate(e.target.value)}
          />
        )}
        {service.type === 'ARTIFICIAL_INSEMINATION' && (
          <TextField
            label="Código de la pajuela"
            maxLength={50}
            value={strawCode}
            onChange={(e) => setStrawCode(e.target.value)}
          />
        )}
        <TextField
          label="Quién hizo la monta"
          maxLength={150}
          value={performedBy}
          onChange={(e) => setPerformedBy(e.target.value)}
        />
        <TextAreaField label="Observaciones" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={update.isPending}>
          Guardar
        </Button>
      </footer>
    </form>
  )
}
