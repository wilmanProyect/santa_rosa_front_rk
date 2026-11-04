import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getErrorMessage } from '@/shared/api/api-error'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  Icon,
  PageHeader,
  SelectField,
  Spinner,
  Tabs,
  TextField,
  useToast,
} from '@/shared/ui'
import { useBreeds, useColors, useDeleteBreed, useDeleteColor, useSaveBreed, useSaveColor } from '../hooks/useCatalogs'
import { ANIMALS_ROUTES } from '../routes'
import { SPECIES_LABELS, type AnimalColor, type Breed, type Species } from '../types/animal.types'

type Tab = 'razas' | 'colores'
type ActiveFilter = '' | 'true' | 'false'

/** Administración de razas (por especie) y colores. Requiere animal-catalogs:manage. */
export function CatalogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'colores' ? 'colores' : 'razas'

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to={ANIMALS_ROUTES.list}>
            <Icon name="arrowLeft" size={14} /> Animales
          </Link>
        }
        title="Razas y colores"
        description="Catálogos para el registro de animales. Lo que está en uso no se elimina: se desactiva."
      />
      <Tabs
        label="Catálogos"
        tabs={[
          { id: 'razas', label: 'Razas', icon: 'animal' },
          { id: 'colores', label: 'Colores', icon: 'palette' },
        ]}
        value={tab}
        onChange={(next) => setSearchParams(next === 'razas' ? {} : { tab: next }, { replace: true })}
      />
      {tab === 'razas' ? <BreedsTab /> : <ColorsTab />}
    </>
  )
}

// ---------- Razas ----------

function BreedsTab() {
  const toast = useToast()
  const [species, setSpecies] = useState<Species | ''>('')
  const [active, setActive] = useState<ActiveFilter>('')
  const { data: breeds, isPending, isError, error } = useBreeds({
    species: species || undefined,
    isActive: active ? active === 'true' : undefined,
  })
  const save = useSaveBreed()
  const remove = useDeleteBreed()
  const [editing, setEditing] = useState<Breed | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Breed | null>(null)

  // Agrupadas por especie: el mismo nombre puede existir en ovinos y caprinos.
  const groups = (['SHEEP', 'GOAT'] as Species[])
    .map((s) => ({ species: s, items: breeds?.filter((b) => b.species === s) ?? [] }))
    .filter((g) => !species || g.species === species)

  return (
    <>
      <div className="toolbar">
        <SelectField
          label="Especie"
          className="visually-hidden-label"
          value={species}
          onChange={(e) => setSpecies(e.target.value as Species | '')}
        >
          <option value="">Ovinos y caprinos</option>
          <option value="SHEEP">Ovinos</option>
          <option value="GOAT">Caprinos</option>
        </SelectField>
        <ActiveSelect value={active} onChange={setActive} />
        <div style={{ flex: '1 1 auto', maxWidth: 'none', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            icon="plus"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Nueva raza
          </Button>
        </div>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
      {breeds && (
        <div className="stack">
          {groups.map((group) => (
            <CatalogTable
              key={group.species}
              title={SPECIES_LABELS[group.species]}
              items={group.items}
              busy={save.isPending}
              emptyText="No hay razas para mostrar."
              onToggle={(breed) =>
                save.mutate(
                  { id: breed.id, body: { isActive: !breed.isActive } },
                  {
                    onSuccess: (b) => toast.show(`Raza "${b.name}" ${b.isActive ? 'activada' : 'desactivada'}`),
                    onError: (err) => toast.show(getErrorMessage(err), 'error'),
                  },
                )
              }
              onEdit={(breed) => {
                setEditing(breed)
                setFormOpen(true)
              }}
              onDelete={(breed) => {
                remove.reset()
                setDeleting(breed)
              }}
            />
          ))}
        </div>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar raza' : 'Nueva raza'}
        description="Cada raza pertenece a una especie. Una raza en uso no puede cambiar de especie."
        size="sm"
        bare
      >
        <BreedForm key={editing?.id ?? 'new'} breed={editing} defaultSpecies={species} onDone={() => setFormOpen(false)} />
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar raza"
        message={
          <>
            ¿Eliminar la raza <strong>{deleting?.name}</strong>? Solo se puede si ningún animal la
            usa; si no, desactívela.
          </>
        }
        confirmLabel="Eliminar"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.show(`Raza "${deleting.name}" eliminada`)
              setDeleting(null)
            },
          })
        }
      />
    </>
  )
}

function BreedForm({
  breed,
  defaultSpecies,
  onDone,
}: {
  breed: Breed | null
  defaultSpecies: Species | ''
  onDone(): void
}) {
  const toast = useToast()
  const save = useSaveBreed()
  const [species, setSpecies] = useState<Species | ''>(breed?.species ?? defaultSpecies)
  const [name, setName] = useState(breed?.name ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body: { species?: Species; name?: string } = {}
    if (!breed || species !== breed.species) body.species = species as Species
    if (!breed || name.trim() !== breed.name) body.name = name.trim()
    if (breed && Object.keys(body).length === 0) {
      onDone()
      return
    }
    save.mutate(
      { id: breed?.id, body },
      {
        onSuccess: (saved) => {
          toast.show(breed ? 'Raza actualizada' : `Raza "${saved.name}" creada`)
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {save.isError && <Alert tone="error">{getErrorMessage(save.error)}</Alert>}
        <SelectField label="Especie" required value={species} onChange={(e) => setSpecies(e.target.value as Species)}>
          <option value="" disabled>
            Seleccione la especie
          </option>
          <option value="SHEEP">Ovino</option>
          <option value="GOAT">Caprino</option>
        </SelectField>
        <TextField
          label="Nombre"
          required
          maxLength={100}
          autoFocus
          placeholder="Ej. Dorper"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {breed ? 'Guardar cambios' : 'Crear raza'}
        </Button>
      </footer>
    </form>
  )
}

// ---------- Colores ----------

function ColorsTab() {
  const toast = useToast()
  const [active, setActive] = useState<ActiveFilter>('')
  const { data: colors, isPending, isError, error } = useColors(active ? { isActive: active === 'true' } : {})
  const save = useSaveColor()
  const remove = useDeleteColor()
  const [editing, setEditing] = useState<AnimalColor | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<AnimalColor | null>(null)

  return (
    <>
      <div className="toolbar">
        <ActiveSelect value={active} onChange={setActive} />
        <div style={{ flex: '1 1 auto', maxWidth: 'none', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            icon="plus"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Nuevo color
          </Button>
        </div>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
      {colors && (
        <CatalogTable
          title="Colores"
          items={colors}
          busy={save.isPending}
          emptyText="No hay colores para mostrar."
          onToggle={(color) =>
            save.mutate(
              { id: color.id, body: { isActive: !color.isActive } },
              {
                onSuccess: (c) => toast.show(`Color "${c.name}" ${c.isActive ? 'activado' : 'desactivado'}`),
                onError: (err) => toast.show(getErrorMessage(err), 'error'),
              },
            )
          }
          onEdit={(color) => {
            setEditing(color)
            setFormOpen(true)
          }}
          onDelete={(color) => {
            remove.reset()
            setDeleting(color)
          }}
        />
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editar color' : 'Nuevo color'} size="sm" bare>
        <ColorForm key={editing?.id ?? 'new'} color={editing} onDone={() => setFormOpen(false)} />
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar color"
        message={
          <>
            ¿Eliminar el color <strong>{deleting?.name}</strong>? Solo se puede si ningún animal lo
            usa; si no, desactívelo.
          </>
        }
        confirmLabel="Eliminar"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.show(`Color "${deleting.name}" eliminado`)
              setDeleting(null)
            },
          })
        }
      />
    </>
  )
}

function ColorForm({ color, onDone }: { color: AnimalColor | null; onDone(): void }) {
  const toast = useToast()
  const save = useSaveColor()
  const [name, setName] = useState(color?.name ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (color && name.trim() === color.name) {
      onDone()
      return
    }
    save.mutate(
      { id: color?.id, body: { name: name.trim() } },
      {
        onSuccess: (saved) => {
          toast.show(color ? 'Color actualizado' : `Color "${saved.name}" creado`)
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {save.isError && <Alert tone="error">{getErrorMessage(save.error)}</Alert>}
        <TextField
          label="Nombre"
          required
          maxLength={50}
          autoFocus
          placeholder="Ej. Blanco"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {color ? 'Guardar cambios' : 'Crear color'}
        </Button>
      </footer>
    </form>
  )
}

// ---------- Piezas comunes ----------

function ActiveSelect({ value, onChange }: { value: ActiveFilter; onChange(value: ActiveFilter): void }) {
  return (
    <SelectField
      label="Estado"
      className="visually-hidden-label"
      value={value}
      onChange={(e) => onChange(e.target.value as ActiveFilter)}
    >
      <option value="">Activos e inactivos</option>
      <option value="true">Solo activos</option>
      <option value="false">Solo inactivos</option>
    </SelectField>
  )
}

interface CatalogItem {
  id: string
  name: string
  isActive: boolean
}

function CatalogTable<T extends CatalogItem>({
  title,
  items,
  busy,
  emptyText,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string
  items: T[]
  busy: boolean
  emptyText: string
  onToggle(item: T): void
  onEdit(item: T): void
  onDelete(item: T): void
}) {
  return (
    <div className="table-wrap">
      <table className="table" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ width: '55%' }}>{title}</th>
            <th>Estado</th>
            <th className="table__actions" style={{ width: 140 }}>
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={3} className="table__empty">
                {emptyText}
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="table__primary">{item.name}</span>
              </td>
              <td>
                {item.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="danger">Inactivo</Badge>}
              </td>
              <td className="table__actions">
                <div className="row">
                  <button
                    type="button"
                    className="icon-btn"
                    title={item.isActive ? 'Desactivar' : 'Activar'}
                    aria-label={`${item.isActive ? 'Desactivar' : 'Activar'} ${item.name}`}
                    disabled={busy}
                    onClick={() => onToggle(item)}
                  >
                    <Icon name="power" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Editar"
                    aria-label={`Editar ${item.name}`}
                    onClick={() => onEdit(item)}
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    title="Eliminar"
                    aria-label={`Eliminar ${item.name}`}
                    onClick={() => onDelete(item)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
