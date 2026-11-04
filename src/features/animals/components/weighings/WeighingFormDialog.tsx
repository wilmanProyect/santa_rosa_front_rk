import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatKg, nullable, optional, todayIso } from '@/shared/lib/format'
import { Alert, Button, Dialog, SelectField, TextAreaField, TextField, useToast } from '@/shared/ui'
import { useCreateWeighing, useUpdateWeighing } from '../../hooks/useWeighings'
import {
  BODY_CONDITION_SCORES,
  UNIQUE_WEIGHING_TYPES,
  WEIGHING_TYPE_LABELS,
  WEIGHT_LIMITS,
  type AnimalDetail,
  type UpdateWeighingRequest,
  type Weighing,
  type WeighingType,
} from '../../types/animal.types'

interface WeighingFormDialogProps {
  open: boolean
  animal: AnimalDetail
  /** Pesaje a corregir; sin él se registra uno nuevo. */
  weighing: Weighing | null
  /** Pesajes existentes, para no ofrecer un segundo nacimiento o destete. */
  existing: Weighing[]
  onClose(): void
}

export function WeighingFormDialog({ open, animal, weighing, existing, onClose }: WeighingFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={weighing ? 'Corregir pesaje' : 'Registrar pesaje'}
      size="sm"
      bare
    >
      <WeighingForm
        key={weighing?.id ?? 'new'}
        animal={animal}
        weighing={weighing}
        existing={existing}
        onDone={onClose}
      />
    </Dialog>
  )
}

function WeighingForm({
  animal,
  weighing,
  existing,
  onDone,
}: {
  animal: AnimalDetail
  weighing: Weighing | null
  existing: Weighing[]
  onDone(): void
}) {
  const toast = useToast()
  const create = useCreateWeighing()
  const update = useUpdateWeighing()
  const mutation = weighing ? update : create

  // Si nunca se pesó, lo natural es el pesaje de nacimiento.
  const defaultType: WeighingType =
    existing.length === 0 && animal.entryOrigin === 'BORN_ON_FARM' ? 'BIRTH' : 'ROUTINE'
  const [weighedAt, setWeighedAt] = useState(weighing?.weighedAt ?? todayIso())
  const [weightKg, setWeightKg] = useState(weighing ? String(weighing.weightKg) : '')
  const [type, setType] = useState<WeighingType>(weighing?.type ?? defaultType)
  const [score, setScore] = useState(
    weighing?.bodyConditionScore != null ? String(weighing.bodyConditionScore) : '',
  )
  const [isEstimated, setIsEstimated] = useState(weighing?.isEstimated ?? false)
  const [nextWeighingAt, setNextWeighingAt] = useState(weighing?.nextWeighingAt ?? '')
  const [notes, setNotes] = useState(weighing?.notes ?? '')
  // Pesaje ya guardado que vino con advertencias: se muestran antes de cerrar.
  const [savedWithWarnings, setSavedWithWarnings] = useState<Weighing | null>(null)

  const usedTypes = new Set(existing.filter((w) => w.id !== weighing?.id).map((w) => w.type))

  function handleSaved(saved: Weighing) {
    if (saved.warnings && saved.warnings.length > 0) {
      setSavedWithWarnings(saved)
      return
    }
    toast.show(weighing ? 'Pesaje corregido' : `Pesaje registrado: ${formatKg(saved.weightKg)}`)
    onDone()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const kg = Number(weightKg)
    if (weighing) {
      const body: UpdateWeighingRequest = {}
      if (weighedAt !== weighing.weighedAt) body.weighedAt = weighedAt
      if (kg !== weighing.weightKg) body.weightKg = kg
      if (type !== weighing.type) body.type = type
      const newScore = score === '' ? null : Number(score)
      if (newScore !== weighing.bodyConditionScore) body.bodyConditionScore = newScore
      if (isEstimated !== weighing.isEstimated) body.isEstimated = isEstimated
      if ((nextWeighingAt || null) !== weighing.nextWeighingAt) body.nextWeighingAt = nextWeighingAt || null
      if (notes.trim() !== (weighing.notes ?? '')) body.notes = nullable(notes)
      if (Object.keys(body).length === 0) {
        onDone()
        return
      }
      update.mutate({ animalId: animal.id, id: weighing.id, body }, { onSuccess: handleSaved })
    } else {
      create.mutate(
        {
          animalId: animal.id,
          body: {
            weighedAt,
            weightKg: kg,
            type,
            bodyConditionScore: score === '' ? undefined : Number(score),
            isEstimated: isEstimated || undefined,
            nextWeighingAt: nextWeighingAt || undefined,
            notes: optional(notes),
          },
        },
        { onSuccess: handleSaved },
      )
    }
  }

  if (savedWithWarnings) {
    return (
      <div className="dialog__form">
        <div className="dialog__body">
          <Alert tone="warning">
            <div className="stack stack--sm">
              <strong>
                Pesaje guardado ({formatKg(savedWithWarnings.weightKg)}), pero revise estos datos:
              </strong>
              <ul className="m-0" style={{ paddingLeft: 18 }}>
                {savedWithWarnings.warnings!.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </Alert>
          <p className="m-0 muted small">
            Si el dato es correcto, cierre este aviso. Si fue un error de carga, corríjalo desde la
            lista de pesajes.
          </p>
        </div>
        <footer className="dialog__footer">
          <Button onClick={onDone}>Entendido</Button>
        </footer>
      </div>
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {mutation.isError && <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>}
        <div className="grid-2">
          <TextField
            label="Fecha"
            type="date"
            required
            min={animal.birthDate ?? undefined}
            max={todayIso()}
            value={weighedAt}
            onChange={(e) => setWeighedAt(e.target.value)}
          />
          <TextField
            label="Peso (kg)"
            type="number"
            inputMode="decimal"
            required
            autoFocus
            min={WEIGHT_LIMITS.min}
            max={WEIGHT_LIMITS.max}
            step={0.01}
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          <SelectField
            label="Motivo"
            required
            value={type}
            onChange={(e) => setType(e.target.value as WeighingType)}
          >
            {(Object.keys(WEIGHING_TYPE_LABELS) as WeighingType[]).map((t) => {
              const taken = UNIQUE_WEIGHING_TYPES.includes(t) && usedTypes.has(t)
              return (
                <option key={t} value={t} disabled={taken}>
                  {WEIGHING_TYPE_LABELS[t]}
                  {taken ? ' (ya registrado)' : ''}
                </option>
              )
            })}
          </SelectField>
          <SelectField label="Condición corporal" value={score} onChange={(e) => setScore(e.target.value)}>
            <option value="">Sin evaluar</option>
            {BODY_CONDITION_SCORES.map((s) => (
              <option key={s} value={s}>
                {s.toLocaleString('es-BO')}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Próximo pesaje"
            hint="Aparecerá en los recordatorios."
            type="date"
            min={weighedAt || undefined}
            value={nextWeighingAt}
            onChange={(e) => setNextWeighingAt(e.target.value)}
          />
          <label className="checkbox" style={{ alignSelf: 'center' }}>
            <input type="checkbox" checked={isEstimated} onChange={(e) => setIsEstimated(e.target.checked)} />
            <span>Peso estimado (sin balanza)</span>
          </label>
        </div>
        {type === 'BIRTH' && (
          <p className="m-0 muted small">
            El peso al nacer debe registrarse dentro de los 7 días del nacimiento.
          </p>
        )}
        <TextAreaField
          label="Observaciones"
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {weighing ? 'Guardar corrección' : 'Registrar pesaje'}
        </Button>
      </footer>
    </form>
  )
}
