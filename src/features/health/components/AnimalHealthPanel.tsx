import { useState } from 'react'
import { animalLabel, type AnimalDetail } from '@/features/animals'
import { Can } from '@/features/auth'
import { PERMISSIONS } from '@/shared/config/permissions'
import { Button } from '@/shared/ui'
import { HealthRecordDialog, type HealthAnimalContext } from './HealthRecordDialog'
import { HealthRecordsTable } from './HealthRecordsTable'

/** Pestaña "Sanidad" de la ficha del animal: su historial sanitario y de manejo. */
export function AnimalHealthPanel({ animal }: { animal: AnimalDetail }) {
  const [creating, setCreating] = useState(false)
  const context: HealthAnimalContext = {
    id: animal.id,
    label: animalLabel(animal),
    species: animal.species,
    birthDate: animal.birthDate,
  }

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="m-0 muted">Historial sanitario y de manejo del animal.</p>
        {animal.status === 'ALIVE' && (
          <Can permissions={[PERMISSIONS.HEALTH_WRITE]}>
            <Button icon="plus" onClick={() => setCreating(true)}>
              Registrar evento
            </Button>
          </Can>
        )}
      </div>
      <HealthRecordsTable animal={context} />
      <HealthRecordDialog open={creating} animal={context} onClose={() => setCreating(false)} />
    </section>
  )
}
