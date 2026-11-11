import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AnimalPicker, SPECIES_LABELS, type ParentRef, type Species } from '@/features/animals'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { Alert, Button, PageHeader, Pagination, SelectField, Spinner, Tabs } from '@/shared/ui'
import { BreedingServicesTable } from '../components/BreedingServicesTable'
import { useBreedingServices } from '../hooks/useReproduction'
import { REPRODUCTION_ROUTES } from '../routes'
import {
  SERVICE_TYPE_LABELS,
  type ServiceStatus,
  type ServiceType,
} from '../types/reproduction.types'
import './reproduction.css'

const PAGE_SIZE = 20

type TabId = 'todas' | ServiceStatus

const TABS: { id: TabId; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'PENDING', label: 'Sin diagnóstico' },
  { id: 'PREGNANT', label: 'Preñadas' },
  { id: 'EMPTY', label: 'Vacías' },
  { id: 'BIRTHED', label: 'Paridas' },
  { id: 'ABORTED', label: 'Abortos' },
]

/** Listado de montas por estado, con filtros. */
export function BreedingServicesPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('estado') as TabId | null
  const tab: TabId = TABS.some((t) => t.id === requested) ? requested! : 'todas'

  const [species, setSpecies] = useState<Species | ''>('')
  const [type, setType] = useState<ServiceType | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [animal, setAnimal] = useState<ParentRef | null>(null)
  const [onlyOverrides, setOnlyOverrides] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isPending, isError, error, isFetching } = useBreedingServices({
    status: tab === 'todas' ? undefined : tab,
    species: species || undefined,
    type: type || undefined,
    from: from || undefined,
    to: to || undefined,
    animalId: animal?.id,
    kinshipOverride: onlyOverrides || undefined,
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
        title="Montas"
        description="Montas dirigidas e inseminaciones, sus diagnósticos de preñez y su resultado."
        actions={
          <>
            {can(PERMISSIONS.REPRODUCTION_WRITE, PERMISSIONS.ANIMALS_CREATE) && (
              <Button variant="secondary" icon="plus" onClick={() => navigate(REPRODUCTION_ROUTES.newBirth)}>
                Parto sin monta
              </Button>
            )}
            {can(PERMISSIONS.REPRODUCTION_WRITE) && (
              <Button icon="heart" onClick={() => navigate(REPRODUCTION_ROUTES.newService)}>
                Registrar monta
              </Button>
            )}
          </>
        }
      />

      <Tabs
        label="Estado de la monta"
        tabs={TABS}
        value={tab}
        onChange={(next) => {
          setSearchParams(next === 'todas' ? {} : { estado: next }, { replace: true })
          setPage(1)
        }}
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
          label="Tipo"
          className="visually-hidden-label"
          value={type}
          onChange={(e) => filter(setType)(e.target.value as ServiceType | '')}
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((t) => (
            <option key={t} value={t}>
              {SERVICE_TYPE_LABELS[t]}
            </option>
          ))}
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
            placeholder="Animal (madre o padre)"
            value={animal}
            onChange={(ref) => filter(setAnimal)(ref)}
          />
        </div>
        <label className="toolbar__check">
          <input
            type="checkbox"
            checked={onlyOverrides}
            onChange={(e) => filter(setOnlyOverrides)(e.target.checked)}
          />
          Solo autorizadas con parentesco
        </label>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
      {data && (
        <>
          <BreedingServicesTable services={data.items} busy={isFetching} />
          <Pagination page={data.page} limit={data.limit} total={data.total} noun="monta(s)" onChange={setPage} />
        </>
      )}
    </>
  )
}
