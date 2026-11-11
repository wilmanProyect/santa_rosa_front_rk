import { Link, useNavigate } from 'react-router'
import { ANIMALS_ROUTES, animalLabel, type AnimalDetail } from '@/features/animals'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDate } from '@/shared/lib/format'
import { Alert, Button, DataItem, Spinner } from '@/shared/ui'
import { useAnimalReproduction } from '../hooks/useReproduction'
import { formatIndicator } from '../lib/reproduction-format'
import { REPRODUCTION_ROUTES } from '../routes'
import { LITTER_TYPE_LABELS, SERVICE_STATUS_LABELS } from '../types/reproduction.types'
import { BirthsTable } from './BirthsTable'
import { BreedingServicesTable } from './BreedingServicesTable'
import '../pages/reproduction.css'

/** Pestaña "Reproducción" de la ficha: resumen, montas y partos del animal. */
export function AnimalReproductionPanel({ animal }: { animal: AnimalDetail }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useAnimalReproduction(animal.id)

  if (isPending) return <Spinner />
  if (isError) return <Alert tone="error">{getErrorMessage(error)}</Alert>

  const { summary } = data
  const female = animal.sex === 'FEMALE'
  const open = summary.openService
  // El parto en el que nació este animal (figura como cría).
  const ownBirth = data.births.find((b) => b.offspring.some((o) => o.animal?.id === animal.id))
  const siblings = ownBirth?.offspring.filter((o) => o.animal && o.animal.id !== animal.id) ?? []
  // Sus partos como madre o padre (sin el suyo propio).
  const births = data.births.filter((b) => b !== ownBirth)

  const canNewService =
    female && !animal.isExternal && animal.status === 'ALIVE' && !open && can(PERMISSIONS.REPRODUCTION_WRITE)

  return (
    <div className="stack">
      {ownBirth && (
        <Alert tone="info">
          Nació en un{' '}
          <Link to={REPRODUCTION_ROUTES.birthDetail(ownBirth.id)}>
            parto {LITTER_TYPE_LABELS[ownBirth.litterType].toLowerCase()}
          </Link>{' '}
          el {formatDate(ownBirth.birthDate)}
          {siblings.length > 0 && (
            <>
              {' '}
              con{' '}
              {siblings.map((s, i) => (
                <span key={s.position}>
                  {i > 0 && ', '}
                  <Link to={ANIMALS_ROUTES.detail(s.animal!.id)}>{animalLabel(s.animal!)}</Link>
                </span>
              ))}
            </>
          )}
          .
        </Alert>
      )}

      {open && (
        <Alert tone={open.status === 'PREGNANT' ? 'info' : 'warning'}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>
              <strong>{SERVICE_STATUS_LABELS[open.status]}</strong>
              {open.status === 'PREGNANT' ? ' de ' : ' · monta con '}
              {animalLabel(open.sire)} el {formatDate(open.serviceDate)}, parto probable el{' '}
              <strong>{formatDate(open.expectedBirthDate)}</strong>.
            </span>
            <Link to={REPRODUCTION_ROUTES.serviceDetail(open.id)}>Ver la monta</Link>
          </div>
        </Alert>
      )}

      <section className="card">
        <header className="card__header">
          <div>
            <h2>Resumen reproductivo</h2>
            <p>{female ? 'Como madre.' : 'Como padre.'}</p>
          </div>
          {canNewService && (
            <Button icon="heart" onClick={() => navigate(`${REPRODUCTION_ROUTES.newService}?hembra=${animal.id}`)}>
              Nueva monta
            </Button>
          )}
        </header>
        <div className="card__body">
          <dl className="data-list">
            <DataItem label="Partos" value={String(summary.births)} />
            <DataItem label="Crías" value={`${summary.bornAlive} vivas de ${summary.offspring}`} />
            <DataItem label="Partos múltiples" value={String(summary.multipleBirths)} />
            <DataItem label="Crías por parto" value={formatIndicator(summary.averageLitterSize, '', 2)} />
            <DataItem label="Último parto" value={summary.lastBirthDate && formatDate(summary.lastBirthDate)} />
          </dl>
        </div>
      </section>

      <section className="stack stack--sm">
        <h2 className="section-title">Montas</h2>
        <BreedingServicesTable services={data.services} emptyMessage="No tiene montas registradas." />
      </section>

      <section className="stack stack--sm">
        <h2 className="section-title">Partos</h2>
        <BirthsTable births={births} emptyMessage="No tiene partos registrados." />
      </section>
    </div>
  )
}
