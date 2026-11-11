import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '@/features/auth'
import { ReviewBanner } from '@/features/reviews'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatAge, formatDate, formatDateTime, formatKg } from '@/shared/lib/format'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataItem,
  Icon,
  PageHeader,
  Spinner,
  Tabs,
  useToast,
  type IconName,
} from '@/shared/ui'
import { AnimalFlags, AnimalStatusBadge } from '../components/AnimalBadges'
import { AnimalThumb } from '../components/AnimalThumb'
import { CertificateCard } from '../components/CertificateCard'
import { ChangeAnimalStatusDialog } from '../components/ChangeAnimalStatusDialog'
import { Genealogy } from '../components/Genealogy'
import { GeneticCategoryCard, GeneticCategoryText } from '../components/GeneticCategory'
import { IssueCertificateButton } from '../components/IssueCertificateButton'
import { PhotoGallery } from '../components/photos/PhotoGallery'
import { WeighingsPanel } from '../components/weighings/WeighingsPanel'
import { useAnimal, useDeleteAnimal } from '../hooks/useAnimals'
import { animalLabel } from '../lib/animal-label'
import { ANIMALS_ROUTES } from '../routes'
import {
  ANIMAL_STATUS_LABELS,
  ENTRY_ORIGIN_LABELS,
  SEX_LABELS,
  SPECIES_LABELS,
  type AnimalDetail,
} from '../types/animal.types'
import './animals.css'

/**
 * Pestaña que otro módulo agrega a la ficha (p. ej. Sanidad). Se inyecta desde el router
 * para que `animals` no dependa de esos módulos.
 */
export interface AnimalExtraTab {
  id: string
  label: string
  icon: IconName
  render(animal: AnimalDetail): ReactNode
  /** Por defecto, visible. */
  visible?(animal: AnimalDetail): boolean
}

const BASE_TABS = ['datos', 'pesajes', 'genealogia', 'fotos']

export function AnimalDetailPage({ extraTabs = [] }: { extraTabs?: AnimalExtraTab[] }) {
  const { animalId } = useParams()
  const { data: animal, isPending, isError, error } = useAnimal(animalId)

  if (isError) {
    return (
      <>
        <BackLink />
        <Alert tone="error">{getErrorMessage(error)}</Alert>
      </>
    )
  }
  if (isPending) return <Spinner />
  return <AnimalDetailView animal={animal} extraTabs={extraTabs} />
}

function BackLink({ external }: { external?: boolean }) {
  return (
    <Link to={external ? `${ANIMALS_ROUTES.list}?vista=externos` : ANIMALS_ROUTES.list}>
      <Icon name="arrowLeft" size={14} /> {external ? 'Reproductores externos' : 'Animales'}
    </Link>
  )
}

function AnimalDetailView({ animal, extraTabs }: { animal: AnimalDetail; extraTabs: AnimalExtraTab[] }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const remove = useDeleteAnimal()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dialog, setDialog] = useState<'status' | 'delete' | null>(null)

  const visibleExtra = extraTabs.filter((t) => t.visible?.(animal) ?? true)
  const requested = searchParams.get('tab') ?? 'datos'
  const tab = [...BASE_TABS, ...visibleExtra.map((t) => t.id)].includes(requested) ? requested : 'datos'
  const setTab = (next: string) => setSearchParams(next === 'datos' ? {} : { tab: next }, { replace: true })
  const meatWithdrawal = animal.withdrawal?.meat ?? null
  const milkWithdrawal = animal.withdrawal?.milk ?? null

  const alive = animal.status === 'ALIVE'
  const canChangeStatus = can(PERMISSIONS.ANIMALS_CHANGE_STATUS) && !animal.isExternal

  return (
    <>
      <PageHeader
        eyebrow={<BackLink external={animal.isExternal} />}
        title={
          <span className="person">
            <AnimalThumb photo={animal.primaryPhoto} species={animal.species} size="lg" />
            <span>
              {animalLabel(animal)}
              <span className="row" style={{ marginTop: 8, gap: 6 }}>
                {!animal.isExternal && <AnimalStatusBadge status={animal.status} />}
                <AnimalFlags isExternal={animal.isExternal} identifierException={animal.identifierException} />
                <span className="muted small" style={{ fontWeight: 600 }}>
                  {SPECIES_LABELS[animal.species]} · {animal.breed.name} · {SEX_LABELS[animal.sex]}
                  {animal.birthDate && ` · ${formatAge(animal.birthDate)}`}
                </span>
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {can(PERMISSIONS.ANIMALS_UPDATE) && (
              <Button variant="secondary" icon="edit" onClick={() => navigate(ANIMALS_ROUTES.edit(animal.id))}>
                Editar
              </Button>
            )}
            {can(PERMISSIONS.ANIMALS_ISSUE_CERTIFICATE) && !animal.isExternal && (
              <IssueCertificateButton animal={animal} />
            )}
            {canChangeStatus && alive && (
              <Button variant="secondary" icon="exit" onClick={() => setDialog('status')}>
                Registrar salida
              </Button>
            )}
            {can(PERMISSIONS.ANIMALS_DELETE) && (
              <Button
                variant="ghost"
                icon="trash"
                aria-label="Eliminar animal"
                title="Eliminar animal"
                onClick={() => {
                  remove.reset()
                  setDialog('delete')
                }}
              />
            )}
          </>
        }
      />

      <div className="stack" style={{ marginBottom: 18 }}>
        <ReviewBanner entityType="ANIMAL" entityId={animal.id} />
        {!alive && !animal.isExternal && (
          <div className="status-banner" role="status">
            <div>
              <strong>{ANIMAL_STATUS_LABELS[animal.status]}</strong>
              {animal.statusDate && <> el {formatDate(animal.statusDate)}</>}
              {animal.statusReason && <div>{animal.statusReason}</div>}
            </div>
            {canChangeStatus && (
              <Button variant="secondary" size="sm" onClick={() => setDialog('status')}>
                Corregir: volver a Vivo
              </Button>
            )}
          </div>
        )}
        {meatWithdrawal && (
          <Alert tone="error">
            <strong>Período de retiro de carne:</strong> no se puede faenar hasta el{' '}
            <strong>{formatDate(meatWithdrawal.endsOn)}</strong> ({meatWithdrawal.productName}, aplicado el{' '}
            {formatDate(meatWithdrawal.appliedAt)}).
          </Alert>
        )}
        {milkWithdrawal && (
          <Alert tone="warning">
            <strong>Retiro de leche</strong> hasta el {formatDate(milkWithdrawal.endsOn)} (
            {milkWithdrawal.productName}).
          </Alert>
        )}
        {animal.identifierException && (
          <Alert tone="warning">
            <strong>Caso especial:</strong> arete o registro ABSID repetido.
            {animal.identifierExceptionReason && <> Motivo: {animal.identifierExceptionReason}</>}
          </Alert>
        )}
      </div>

      <Tabs
        label="Secciones del animal"
        tabs={[
          { id: 'datos', label: 'Datos', icon: 'tag' },
          ...(animal.isExternal ? [] : [{ id: 'pesajes', label: 'Pesajes', icon: 'activity' as const }]),
          { id: 'genealogia', label: 'Genealogía y crías', icon: 'tree' },
          { id: 'fotos', label: 'Fotos', icon: 'camera' },
          ...visibleExtra.map(({ id, label, icon }) => ({ id, label, icon })),
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'datos' && <AnimalData animal={animal} />}
      {tab === 'genealogia' && <Genealogy animal={animal} />}
      {tab === 'fotos' && <PhotoGallery animal={animal} />}
      {tab === 'pesajes' && <WeighingsPanel animal={animal} />}
      {visibleExtra.find((t) => t.id === tab)?.render(animal)}

      <ChangeAnimalStatusDialog open={dialog === 'status'} animal={animal} onClose={() => setDialog(null)} />
      <ConfirmDialog
        open={dialog === 'delete'}
        title="Eliminar animal"
        message={
          <>
            Eliminar es solo para registros <strong>cargados por error</strong>. Si el animal murió,
            se vendió, se faenó o se regaló, use <em>Registrar salida</em>: conserva su historial.
            No se puede eliminar un animal con crías registradas.
          </>
        }
        confirmLabel="Eliminar registro"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          remove.mutate(animal.id, {
            onSuccess: () => {
              toast.show(`${animalLabel(animal)} eliminado`)
              navigate(ANIMALS_ROUTES.list, { replace: true })
            },
          })
        }
      />
    </>
  )
}

function AnimalData({ animal }: { animal: AnimalDetail }) {
  return (
    <div className="stack">
      <Card title="Identificación">
        <DataItem label="Arete" value={animal.earTag} />
        <DataItem label="Nombre" value={animal.name} />
        <DataItem label="Especie" value={SPECIES_LABELS[animal.species]} />
        <DataItem label="Raza" value={animal.breed.name} />
        <DataItem label="Sexo" value={SEX_LABELS[animal.sex]} />
        <DataItem label="Color" value={animal.color?.name} />
        <DataItem
          label="Categoría genética"
          value={
            animal.geneticCategory && (
              <GeneticCategoryText
                category={animal.geneticCategory}
                confirmed={animal.geneticCategoryConfirmed}
                long
              />
            )
          }
        />
      </Card>

      <Card title="Registros">
        <DataItem label="Registro ABSID" value={animal.absidRegistry} />
        <DataItem label="Registro externo" value={animal.externalRegistry} />
      </Card>

      <GeneticCategoryCard animal={animal} />

      <Card title="Nacimiento y pesos">
        <DataItem label="Fecha de nacimiento" value={animal.birthDate && formatDate(animal.birthDate)} />
        <DataItem label="Edad" value={animal.birthDate && formatAge(animal.birthDate)} />
        <DataItem label="Peso al nacer" value={animal.birthWeightKg !== null && formatKg(animal.birthWeightKg)} />
        <DataItem
          label="Destete"
          value={
            animal.weaningWeightKg !== null &&
            `${formatKg(animal.weaningWeightKg)}${animal.weaningDate ? ` · ${formatDate(animal.weaningDate)}` : ''}`
          }
        />
        <DataItem
          label="Último pesaje"
          value={
            animal.lastWeighing &&
            `${formatKg(animal.lastWeighing.weightKg)} · ${formatDate(animal.lastWeighing.weighedAt)}`
          }
        />
      </Card>

      {animal.isExternal ? (
        <Card title="Procedencia">
          <DataItem label="Cabaña o centro de origen" value={animal.sourceFarm} />
        </Card>
      ) : (
        <Card title="Ingreso a la cabaña">
          <DataItem label="Origen" value={animal.entryOrigin && ENTRY_ORIGIN_LABELS[animal.entryOrigin]} />
          <DataItem label="Fecha de ingreso" value={animal.entryDate && formatDate(animal.entryDate)} />
          <DataItem label="Cabaña de procedencia" value={animal.sourceFarm} />
        </Card>
      )}

      <CertificateCard animal={animal} />

      {animal.notes && (
        <section className="card">
          <header className="card__header">
            <h2>Observaciones</h2>
          </header>
          <div className="card__body">
            <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>
              {animal.notes}
            </p>
          </div>
        </section>
      )}

      <Card title="Registro">
        <DataItem label="Creado" value={formatDateTime(animal.createdAt)} />
        <DataItem label="Última modificación" value={formatDateTime(animal.updatedAt)} />
        {animal.isExternal && <DataItem label="Tipo" value={<Badge tone="accent">Reproductor externo</Badge>} />}
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <header className="card__header">
        <h2>{title}</h2>
      </header>
      <div className="card__body">
        <dl className="data-list">{children}</dl>
      </div>
    </section>
  )
}
