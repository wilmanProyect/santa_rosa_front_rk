import { useState, type FormEvent } from 'react'
import { AnimalPicker, animalLabel, type AnimalSummary, type ParentRef, type Species } from '@/features/animals'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatDate } from '@/shared/lib/format'
import { Alert, Button, Dialog, useToast } from '@/shared/ui'
import { useCreateHealthRecord, useUpdateHealthRecord } from '../hooks/useHealth'
import {
  buildHealthFields,
  buildHealthUpdate,
  emptyHealthForm,
  toHealthForm,
  validateHealthForm,
  type HealthFormValues,
} from '../lib/health-form'
import { GENERAL_EVENT_TYPES, HEALTH_EVENT_LABELS, type HealthRecord } from '../types/health.types'
import { HealthFields } from './HealthFields'

/** Animal fijo del evento (desde su ficha). */
export interface HealthAnimalContext {
  id: string
  label: string
  species: Species
  birthDate: string | null
}

interface HealthRecordDialogProps {
  open: boolean
  onClose(): void
  /** Evento a corregir; sin él se registra uno nuevo. */
  record?: HealthRecord | null
  /** Si se indica, el evento es de este animal y no se elige otro. */
  animal?: HealthAnimalContext
}

export function HealthRecordDialog({ open, onClose, record, animal }: HealthRecordDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={record ? 'Corregir evento sanitario' : 'Registrar evento sanitario'}
      description={animal ? animal.label : undefined}
      size="lg"
      bare
    >
      <HealthRecordForm key={record?.id ?? 'new'} record={record ?? null} animal={animal} onDone={onClose} />
    </Dialog>
  )
}

function HealthRecordForm({
  record,
  animal,
  onDone,
}: {
  record: HealthRecord | null
  animal?: HealthAnimalContext
  onDone(): void
}) {
  const toast = useToast()
  const create = useCreateHealthRecord()
  const update = useUpdateHealthRecord()
  const mutation = record ? update : create

  const [initial] = useState<HealthFormValues>(() => (record ? toHealthForm(record) : emptyHealthForm()))
  const [values, setValues] = useState(initial)
  const [picked, setPicked] = useState<{ ref: ParentRef; animal: AnimalSummary } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isGeneral = GENERAL_EVENT_TYPES.includes(values.type)
  // Al editar, el animal no se cambia; al crear desde la ficha, viene fijo.
  const needsPicker = !record && !animal && !isGeneral
  const species = animal?.species ?? picked?.animal.species

  function handleSaved(saved: HealthRecord) {
    toast.show(record ? 'Evento corregido' : `Evento registrado: ${HEALTH_EVENT_LABELS[saved.type]}`)
    if (saved.meatWithdrawalEndsOn) {
      toast.show(`Período de retiro: no se puede faenar hasta el ${formatDate(saved.meatWithdrawalEndsOn)}`, 'info')
    }
    onDone()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const problem = validateHealthForm(values)
    if (problem) {
      setError(problem)
      return
    }
    if (record) {
      const body = buildHealthUpdate(initial, values)
      if (Object.keys(body).length === 0) {
        onDone()
        return
      }
      update.mutate({ id: record.id, body }, { onSuccess: handleSaved })
      return
    }
    const animalId = isGeneral ? undefined : (animal?.id ?? picked?.ref.id)
    if (!isGeneral && !animalId) {
      setError('Elija el animal.')
      return
    }
    create.mutate({ ...buildHealthFields(values), animalId }, { onSuccess: handleSaved })
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {(error || mutation.isError) && <Alert tone="error">{error ?? getErrorMessage(mutation.error)}</Alert>}

        {needsPicker && (
          <AnimalPicker
            label="Animal"
            species=""
            anySpecies
            status="ALIVE"
            hint="Animales vivos de la cabaña. Para un lote, use la aplicación masiva."
            value={picked?.ref ?? null}
            onChange={(ref, summary) => setPicked(ref && summary ? { ref, animal: summary } : null)}
          />
        )}
        {isGeneral && !record && (
          <Alert tone="info">La limpieza de corral es un evento general: no se asigna a un animal.</Alert>
        )}
        {picked && (
          <p className="m-0 muted small">
            Registrando para <strong>{animalLabel(picked.animal)}</strong>.
          </p>
        )}

        <HealthFields
          values={values}
          onChange={setValues}
          species={species}
          minDate={animal?.birthDate ?? picked?.animal.birthDate}
          animalEventsOnly={!!animal || (!!record && record.animalId !== null)}
        />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {record ? 'Guardar corrección' : 'Registrar'}
        </Button>
      </footer>
    </form>
  )
}
