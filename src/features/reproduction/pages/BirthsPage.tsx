import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimalPicker, SPECIES_LABELS, type ParentRef, type Species } from '@/features/animals'
import { Can } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { Alert, Button, PageHeader, Pagination, SelectField, Spinner } from '@/shared/ui'
import { BirthsTable } from '../components/BirthsTable'
import { useBirths } from '../hooks/useReproduction'
import { REPRODUCTION_ROUTES } from '../routes'
import { LITTER_TYPE_BY_SIZE, LITTER_TYPE_LABELS, MAX_LITTER_SIZE } from '../types/reproduction.types'
import './reproduction.css'

const PAGE_SIZE = 20

/** Listado de partos (incluidos los históricos reconstruidos por la migración). */
export function BirthsPage() {
  const navigate = useNavigate()
  const [species, setSpecies] = useState<Species | ''>('')
  const [litterSize, setLitterSize] = useState('')
  const [historical, setHistorical] = useState<'' | 'true' | 'false'>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [animal, setAnimal] = useState<ParentRef | null>(null)
  const [page, setPage] = useState(1)

  const { data, isPending, isError, error, isFetching } = useBirths({
    species: species || undefined,
    litterSize: litterSize ? Number(litterSize) : undefined,
    isHistorical: historical === '' ? undefined : historical === 'true',
    from: from || undefined,
    to: to || undefined,
    animalId: animal?.id,
    page,
    limit: PAGE_SIZE,
  })

  const filter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  return (
    <>
      <PageHeader
        eyebrow="Reproducción"
        title="Partos"
        description="Partos con sus crías. Los históricos se reconstruyeron de los animales ya cargados y no tienen monta."
        actions={
          <Can permissions={[PERMISSIONS.REPRODUCTION_WRITE, PERMISSIONS.ANIMALS_CREATE]}>
            <Button icon="plus" onClick={() => navigate(REPRODUCTION_ROUTES.newBirth)}>
              Parto sin monta
            </Button>
          </Can>
        }
      />

      <div className="toolbar">
        <SelectField
          label="Especie"
          className="visually-hidden-label"
          value={species}
          onChange={(e) => filter(setSpecies)(e.target.value as Species | '')}
        >
          <option value="">Ambas especies</option>
          {(Object.keys(SPECIES_LABELS) as Species[]).map((s) => (
            <option key={s} value={s}>
              {SPECIES_LABELS[s]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Tipo de parto"
          className="visually-hidden-label"
          value={litterSize}
          onChange={(e) => filter(setLitterSize)(e.target.value)}
        >
          <option value="">Todos los tipos de parto</option>
          {Array.from({ length: MAX_LITTER_SIZE }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {LITTER_TYPE_LABELS[LITTER_TYPE_BY_SIZE[n]]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Origen"
          className="visually-hidden-label"
          value={historical}
          onChange={(e) => filter(setHistorical)(e.target.value as typeof historical)}
        >
          <option value="">Registrados e históricos</option>
          <option value="false">Solo registrados</option>
          <option value="true">Solo históricos</option>
        </SelectField>
        <div className="toolbar__range">
          <label>
            <span>Desde</span>
            <input
              className="input"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => filter(setFrom)(e.target.value)}
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              className="input"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => filter(setTo)(e.target.value)}
            />
          </label>
        </div>
        <div className="visually-hidden-label">
          <AnimalPicker
            label="Animal"
            species=""
            anySpecies
            includeExternal
            placeholder="Animal (madre, padre o cría)"
            value={animal}
            onChange={(ref) => filter(setAnimal)(ref)}
          />
        </div>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
      {data && (
        <>
          <BirthsTable births={data.items} busy={isFetching} />
          <Pagination page={data.page} limit={data.limit} total={data.total} noun="parto(s)" onChange={setPage} />
        </>
      )}
    </>
  )
}
