import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Button, Dialog, TextAreaField, TextField, useToast } from '@/shared/ui'
import { useCreateArea, useUpdateArea } from '../hooks/useAreas'
import type { Area } from '../types/area.types'

interface AreaFormDialogProps {
  open: boolean
  /** Área a editar; sin ella, el formulario crea una nueva. */
  area?: Area | null
  onClose(): void
}

export function AreaFormDialog({ open, area, onClose }: AreaFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={area ? 'Editar área' : 'Nueva área'}
      description={
        area
          ? 'Los cambios se reflejan de inmediato en usuarios y roles.'
          : 'Las áreas agrupan al personal y a sus roles.'
      }
      size="sm"
      bare
    >
      {/* `key` reinicia el formulario cada vez que se abre con otra área. */}
      <AreaForm key={area?.id ?? 'new'} area={area ?? null} onDone={onClose} />
    </Dialog>
  )
}

function AreaForm({ area, onDone }: { area: Area | null; onDone(): void }) {
  const toast = useToast()
  const create = useCreateArea()
  const update = useUpdateArea()
  const mutation = area ? update : create

  const [name, setName] = useState(area?.name ?? '')
  const [description, setDescription] = useState(area?.description ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body = { name: name.trim(), description: description.trim() }
    const onSuccess = () => {
      toast.show(area ? 'Área actualizada' : `Área "${body.name}" creada`)
      onDone()
    }
    if (area) update.mutate({ id: area.id, body }, { onSuccess })
    else create.mutate(body, { onSuccess })
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {mutation.isError && <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>}
        <TextField
          label="Nombre"
          required
          minLength={2}
          maxLength={100}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Producción ovina"
        />
        <TextAreaField
          label="Descripción"
          maxLength={255}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {area ? 'Guardar cambios' : 'Crear área'}
        </Button>
      </footer>
    </form>
  )
}
