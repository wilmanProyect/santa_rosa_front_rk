import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { optional } from '@/shared/lib/format'
import { Alert, Button, Dialog, SelectField, TextField, useToast } from '@/shared/ui'
import { useCreateAnimal } from '../hooks/useAnimals'
import { useBreeds, useSaveColor } from '../hooks/useCatalogs'
import { SPECIES_LABELS, type AnimalColor, type ParentRef, type Species } from '../types/animal.types'

const upper = (value: string) => value.toUpperCase()

interface QuickExternalSireDialogProps {
  open: boolean
  species: Species
  onClose(): void
  onCreated(parent: ParentRef): void
}

/** Registrar un reproductor externo sin salir del formulario del animal. */
export function QuickExternalSireDialog({ open, species, onClose, onCreated }: QuickExternalSireDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar reproductor externo"
      description={`Macho ${SPECIES_LABELS[species].toLowerCase()} ajeno a la cabaña (p. ej. donante de semen). Solo existe para la genealogía.`}
      bare
    >
      <QuickExternalForm key={species} species={species} onDone={onClose} onCreated={onCreated} />
    </Dialog>
  )
}

function QuickExternalForm({
  species,
  onDone,
  onCreated,
}: {
  species: Species
  onDone(): void
  onCreated(parent: ParentRef): void
}) {
  const toast = useToast()
  const create = useCreateAnimal()
  const { data: breeds } = useBreeds({ species, isActive: true })
  const [values, setValues] = useState({
    earTag: '',
    name: '',
    breedId: '',
    absidRegistry: '',
    externalRegistry: '',
    sourceFarm: '',
  })
  const [error, setError] = useState<string | null>(null)
  const set = (key: keyof typeof values, transform = (v: string) => v) =>
    (e: { target: { value: string } }) =>
      setValues((v) => ({ ...v, [key]: transform(e.target.value) }))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!values.earTag.trim() && !values.name.trim() && !values.absidRegistry.trim() && !values.externalRegistry.trim()) {
      setError('Indique al menos arete, nombre, registro ABSID o registro externo.')
      return
    }
    create.mutate(
      {
        isExternal: true,
        species,
        sex: 'MALE',
        breedId: values.breedId,
        earTag: optional(values.earTag),
        name: optional(values.name),
        absidRegistry: optional(values.absidRegistry),
        externalRegistry: optional(values.externalRegistry),
        sourceFarm: optional(values.sourceFarm),
      },
      {
        onSuccess: (animal) => {
          toast.show('Reproductor externo registrado')
          onCreated({ id: animal.id, earTag: animal.earTag, name: animal.name, isExternal: true })
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {(error || create.isError) && (
          <Alert tone="error">{error ?? getErrorMessage(create.error)}</Alert>
        )}
        <div className="grid-2">
          <TextField label="Arete" maxLength={30} value={values.earTag} onChange={set('earTag', upper)} />
          <TextField label="Nombre" maxLength={100} value={values.name} onChange={set('name')} />
          <SelectField label="Raza" required value={values.breedId} onChange={set('breedId')}>
            <option value="" disabled>
              Seleccione una raza
            </option>
            {breeds?.map((breed) => (
              <option key={breed.id} value={breed.id}>
                {breed.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Registro ABSID"
            maxLength={50}
            value={values.absidRegistry}
            onChange={set('absidRegistry', upper)}
          />
          <TextField
            label="Registro externo"
            hint="Otra entidad o código en el centro de semen"
            maxLength={100}
            value={values.externalRegistry}
            onChange={set('externalRegistry', upper)}
          />
          <TextField
            label="Cabaña o centro de origen"
            maxLength={150}
            value={values.sourceFarm}
            onChange={set('sourceFarm')}
          />
        </div>
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={create.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={create.isPending}>
          Registrar y seleccionar
        </Button>
      </footer>
    </form>
  )
}

interface QuickColorDialogProps {
  open: boolean
  onClose(): void
  onCreated(color: AnimalColor): void
}

/** "+ Nuevo color" junto al select del formulario de animales. */
export function QuickColorDialog({ open, onClose, onCreated }: QuickColorDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Nuevo color" size="sm" bare>
      <QuickColorForm onDone={onClose} onCreated={onCreated} />
    </Dialog>
  )
}

function QuickColorForm({ onDone, onCreated }: { onDone(): void; onCreated(color: AnimalColor): void }) {
  const save = useSaveColor()
  const [name, setName] = useState('')

  return (
    <form
      className="dialog__form"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate(
          { body: { name: name.trim() } },
          {
            onSuccess: (color) => {
              onCreated(color)
              onDone()
            },
          },
        )
      }}
    >
      <div className="dialog__body">
        {save.isError && <Alert tone="error">{getErrorMessage(save.error)}</Alert>}
        <TextField
          label="Nombre"
          required
          maxLength={50}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          Crear color
        </Button>
      </footer>
    </form>
  )
}
