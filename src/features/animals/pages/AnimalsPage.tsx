import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Can } from '@/features/auth'
import { ReviewFlag } from '@/features/reviews'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatAge } from '@/shared/lib/format'
import { Alert, Button, Icon, PageHeader, Pagination, SelectField, Spinner, Tabs } from '@/shared/ui'
import { AnimalFlags, AnimalStatusBadge } from '../components/AnimalBadges'
import { AnimalThumb } from '../components/AnimalThumb'
import { GeneticCategoryText } from '../components/GeneticCategory'
import { useAnimals } from '../hooks/useAnimals'
import { useBreeds, useColors } from '../hooks/useCatalogs'
import { ANIMALS_ROUTES } from '../routes'
import {
  ANIMAL_STATUS_LABELS,
  GENETIC_CATEGORY_LABELS,
  SEX_LABELS,
  SPECIES_LABELS,
  type AnimalStatus,
  type GeneticCategory,
  type Sex,
  type Species,
} from '../types/animal.types'
import './animals.css'

const PAGE_SIZE = 20

type View = 'cabana' | 'externos'

export function AnimalsPage() {
  const navigate = useNavigate()
  // La vista (cabaña / externos) vive en la URL para poder volver a ella desde la ficha.
  const [searchParams, setSearchParams] = useSearchParams()
  const view: View = searchParams.get('vista') === 'externos' ? 'externos' : 'cabana'
  const isExternal = view === 'externos'

  const [search, setSearch] = useState('')
  // Por defecto, el inventario actual (vivos).
  const [status, setStatus] = useState<AnimalStatus | ''>('ALIVE')
  const [species, setSpecies] = useState<Species | ''>('')
  const [sex, setSex] = useState<Sex | ''>('')
  const [breedId, setBreedId] = useState('')
  const [colorId, setColorId] = useState('')
  const [category, setCategory] = useState<GeneticCategory | ''>('')
  const [onlyExceptions, setOnlyExceptions] = useState(false)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data: breeds } = useBreeds(species ? { species } : {})
  const { data: colors } = useColors()
  const { data, isPending, isError, error, isFetching } = useAnimals({
    isExternal,
    search: debouncedSearch || undefined,
    status: isExternal ? undefined : status || undefined,
    species: species || undefined,
    sex: sex || undefined,
    breedId: breedId || undefined,
    colorId: colorId || undefined,
    geneticCategory: category || undefined,
    identifierException: onlyExceptions || undefined,
    page,
    limit: PAGE_SIZE,
  })

  /** Envuelve un setter para volver a la página 1 al cambiar un filtro. */
  const filter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  return (
    <>
      <PageHeader
        eyebrow="Ganado"
        title="Animales"
        description="Inventario de ovinos y caprinos de la cabaña, con su genealogía y fotos."
        actions={
          <>
            <Can permissions={[PERMISSIONS.ANIMAL_CATALOGS_MANAGE]}>
              <Button variant="secondary" icon="palette" onClick={() => navigate(ANIMALS_ROUTES.catalogs)}>
                Razas y colores
              </Button>
            </Can>
            <Can permissions={[PERMISSIONS.ANIMALS_CREATE]}>
              <Button
                variant="secondary"
                icon="external"
                onClick={() => navigate(`${ANIMALS_ROUTES.create}?externo=1`)}
              >
                Reproductor externo
              </Button>
              <Button icon="plus" onClick={() => navigate(ANIMALS_ROUTES.create)}>
                Registrar animal
              </Button>
            </Can>
          </>
        }
      />

      <Tabs
        label="Tipo de animal"
        tabs={[
          { id: 'cabana', label: 'De la cabaña', icon: 'animal' },
          { id: 'externos', label: 'Reproductores externos', icon: 'external' },
        ]}
        value={view}
        onChange={(next) => {
          setSearchParams(next === 'externos' ? { vista: 'externos' } : {}, { replace: true })
          setPage(1)
        }}
      />

      <div className="toolbar">
        <div className="input-icon toolbar__search">
          <Icon name="search" />
          <input
            className="input"
            type="search"
            placeholder="Buscar por arete, nombre, ABSID o registro externo"
            aria-label="Buscar animales"
            value={search}
            onChange={(e) => filter(setSearch)(e.target.value)}
          />
        </div>
        {!isExternal && (
          <SelectField
            label="Estado"
            className="visually-hidden-label"
            value={status}
            onChange={(e) => filter(setStatus)(e.target.value as AnimalStatus | '')}
          >
            <option value="ALIVE">Inventario actual (vivos)</option>
            <option value="">Todos los estados</option>
            {(Object.keys(ANIMAL_STATUS_LABELS) as AnimalStatus[])
              .filter((s) => s !== 'ALIVE')
              .map((s) => (
                <option key={s} value={s}>
                  {ANIMAL_STATUS_LABELS[s]}
                </option>
              ))}
          </SelectField>
        )}
        <SelectField
          label="Especie"
          className="visually-hidden-label"
          value={species}
          onChange={(e) => {
            filter(setSpecies)(e.target.value as Species | '')
            setBreedId('') // la raza depende de la especie
          }}
        >
          <option value="">Ovinos y caprinos</option>
          {(Object.keys(SPECIES_LABELS) as Species[]).map((s) => (
            <option key={s} value={s}>
              {SPECIES_LABELS[s]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Sexo"
          className="visually-hidden-label"
          value={sex}
          onChange={(e) => filter(setSex)(e.target.value as Sex | '')}
        >
          <option value="">Machos y hembras</option>
          <option value="MALE">Machos</option>
          <option value="FEMALE">Hembras</option>
        </SelectField>
        <SelectField
          label="Raza"
          className="visually-hidden-label"
          value={breedId}
          onChange={(e) => filter(setBreedId)(e.target.value)}
        >
          <option value="">Todas las razas</option>
          {breeds?.map((breed) => (
            <option key={breed.id} value={breed.id}>
              {breed.name}
              {!species && ` (${SPECIES_LABELS[breed.species]})`}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Color"
          className="visually-hidden-label"
          value={colorId}
          onChange={(e) => filter(setColorId)(e.target.value)}
        >
          <option value="">Todos los colores</option>
          {colors?.map((color) => (
            <option key={color.id} value={color.id}>
              {color.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Categoría genética"
          className="visually-hidden-label"
          value={category}
          onChange={(e) => filter(setCategory)(e.target.value as GeneticCategory | '')}
        >
          <option value="">Todas las categorías</option>
          {(Object.keys(GENETIC_CATEGORY_LABELS) as GeneticCategory[]).map((c) => (
            <option key={c} value={c}>
              {GENETIC_CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
        <label className="checkbox toolbar__check">
          <input
            type="checkbox"
            checked={onlyExceptions}
            onChange={(e) => filter(setOnlyExceptions)(e.target.checked)}
          />
          <span>Solo casos especiales</span>
        </label>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {data && (
        <>
          <div className="table-wrap" aria-busy={isFetching}>
            <table className="table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Especie / raza</th>
                  <th>Sexo</th>
                  <th>Edad</th>
                  <th>Categoría</th>
                  {!isExternal && <th>Estado</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="table__empty">
                      <div className="empty">
                        <Icon name="animal" size={28} />
                        {isExternal
                          ? 'No hay reproductores externos que coincidan con los filtros.'
                          : 'No hay animales que coincidan con los filtros.'}
                      </div>
                    </td>
                  </tr>
                )}
                {data.items.map((animal) => (
                  <tr
                    key={animal.id}
                    className="is-clickable"
                    onClick={() => navigate(ANIMALS_ROUTES.detail(animal.id))}
                  >
                    <td>
                      <div className="person">
                        <AnimalThumb photo={animal.primaryPhoto} species={animal.species} />
                        <div>
                          <Link
                            to={ANIMALS_ROUTES.detail(animal.id)}
                            className="table__primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {animal.earTag ?? <span className="muted">Sin arete</span>}
                          </Link>
                          <div className="row" style={{ gap: 4 }}>
                            {animal.name && <span className="muted small">{animal.name}</span>}
                            <AnimalFlags
                              isExternal={false}
                              identifierException={animal.identifierException}
                            />
                            <ReviewFlag entityType="ANIMAL" entityId={animal.id} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {SPECIES_LABELS[animal.species]}
                      <div className="muted small">{animal.breed.name}</div>
                    </td>
                    <td>{SEX_LABELS[animal.sex]}</td>
                    <td className="nowrap">{formatAge(animal.birthDate)}</td>
                    <td>
                      <GeneticCategoryText
                        category={animal.geneticCategory}
                        confirmed={animal.geneticCategoryConfirmed}
                        long
                      />
                    </td>
                    {!isExternal && (
                      <td>
                        <AnimalStatusBadge status={animal.status} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            noun={isExternal ? 'reproductor(es)' : 'animal(es)'}
            onChange={setPage}
          />
        </>
      )}
    </>
  )
}
