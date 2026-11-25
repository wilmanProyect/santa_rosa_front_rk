import { animalLabel, useAnimal, useWeighings, WeighingFormDialog } from '@/features/animals'
import { HealthRecordDialog } from '@/features/health'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Dialog, Spinner } from '@/shared/ui'
import type { ControlItem, ControlType } from '../types/controls.types'

interface RegisterControlDialogProps {
  type: ControlType
  /** Animal a registrar; `null` cierra el diálogo. */
  item: ControlItem | null
  onClose(): void
}

/**
 * "Registrar" desde Controles: abre el formulario que ya existe con el animal precargado.
 * Destete → pesaje de tipo destete; control de peso → pesaje; sanitario → evento sanitario.
 */
export function RegisterControlDialog({ type, item, onClose }: RegisterControlDialogProps) {
  if (!item) return null
  if (type === 'HEALTH') {
    return (
      <HealthRecordDialog
        open
        onClose={onClose}
        animal={{ id: item.animalId, label: animalLabel(item), species: item.species, birthDate: item.birthDate }}
      />
    )
  }
  return <RegisterWeighing key={item.animalId} item={item} weaning={type === 'WEANING'} onClose={onClose} />
}

/** El formulario de pesaje necesita la ficha y los pesajes del animal: se cargan primero. */
function RegisterWeighing({ item, weaning, onClose }: { item: ControlItem; weaning: boolean; onClose(): void }) {
  const animal = useAnimal(item.animalId)
  const weighings = useWeighings(item.animalId)

  if (animal.data && weighings.data) {
    return (
      <WeighingFormDialog
        open
        animal={animal.data}
        weighing={null}
        existing={weighings.data}
        defaultType={weaning ? 'WEANING' : 'ROUTINE'}
        onClose={onClose}
      />
    )
  }

  const error = animal.error ?? weighings.error
  return (
    <Dialog open onClose={onClose} title="Registrar pesaje" description={animalLabel(item)} size="sm">
      {error ? <Alert tone="error">{getErrorMessage(error)}</Alert> : <Spinner />}
    </Dialog>
  )
}
