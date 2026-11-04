import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatAge } from '@/shared/lib/format'
import { Alert, Badge, Icon, Pagination, Spinner } from '@/shared/ui'
import { useAnimal, useAnimals } from '../hooks/useAnimals'
import { animalLabel } from '../lib/animal-label'
import { ANIMALS_ROUTES } from '../routes'
import { SEX_LABELS, type AnimalDetail, type ParentRef } from '../types/animal.types'
import { AnimalStatusBadge } from './AnimalBadges'
import { AnimalThumb } from './AnimalThumb'

/** Padres y abuelos (pidiendo la ficha de cada padre) y la lista de crías. */
export function Genealogy({ animal }: { animal: AnimalDetail }) {
  return (
    <div className="stack">
      <section className="card">
        <header className="card__header">
          <div>
            <h2>Genealogía</h2>
            <p>Padres y abuelos registrados.</p>
          </div>
        </header>
        <div className="card__body stack">
          <div className="parents">
            <ParentCard role="Madre" parent={animal.dam} />
            <ParentCard role="Padre" parent={animal.sire} />
          </div>
          <div className="parents">
            <Grandparents role="madre" parent={animal.dam} />
            <Grandparents role="padre" parent={animal.sire} />
          </div>
        </div>
      </section>
      <Offspring animal={animal} />
    </div>
  )
}

function ParentCard({ role, parent }: { role: string; parent: ParentRef | null }) {
  if (!parent) {
    return (
      <div className="parent-card parent-card--empty">
        <Icon name="tree" />
        <div>
          <div className="parent-card__role">{role}</div>
          Sin registrar
        </div>
      </div>
    )
  }
  return (
    <Link to={ANIMALS_ROUTES.detail(parent.id)} className="parent-card">
      <Icon name="animal" />
      <div>
        <div className="parent-card__role">{role}</div>
        <strong>{animalLabel(parent)}</strong> {parent.isExternal && <Badge tone="accent">Externo</Badge>}
      </div>
    </Link>
  )
}

/** Abuelos por la línea de un padre: se obtienen de la ficha del padre. */
function Grandparents({ role, parent }: { role: string; parent: ParentRef | null }) {
  const { data, isPending } = useAnimal(parent?.id)
  if (!parent) return <div />
  return (
    <div className="stack stack--sm">
      <span className="parent-card__role">Abuelos por {role}</span>
      {isPending ? (
        <Spinner />
      ) : (
        <>
          <ParentCard role={`Abuela (${role})`} parent={data?.dam ?? null} />
          <ParentCard role={`Abuelo (${role})`} parent={data?.sire ?? null} />
        </>
      )}
    </div>
  )
}

const OFFSPRING_PAGE = 10

function Offspring({ animal }: { animal: AnimalDetail }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isPending, isError, error } = useAnimals({
    parentId: animal.id,
    page,
    limit: OFFSPRING_PAGE,
  })

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Crías</h2>
          <p>Crías de la cabaña donde este animal figura como madre o padre.</p>
        </div>
      </header>
      <div className="card__body">
        {isPending && <Spinner />}
        {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
        {data && data.items.length === 0 && (
          <div className="empty">
            <Icon name="tree" size={28} />
            No tiene crías registradas.
          </div>
        )}
        {data && data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cría</th>
                    <th>Sexo</th>
                    <th>Edad</th>
                    <th>{animal.sex === 'FEMALE' ? 'Padre' : 'Madre'}</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((child) => {
                    const otherParent = animal.sex === 'FEMALE' ? child.sire : child.dam
                    return (
                      <tr
                        key={child.id}
                        className="is-clickable"
                        onClick={() => navigate(ANIMALS_ROUTES.detail(child.id))}
                      >
                        <td>
                          <div className="person">
                            <AnimalThumb photo={child.primaryPhoto} species={child.species} />
                            <Link
                              to={ANIMALS_ROUTES.detail(child.id)}
                              className="table__primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {animalLabel(child)}
                            </Link>
                          </div>
                        </td>
                        <td>{SEX_LABELS[child.sex]}</td>
                        <td className="nowrap">{formatAge(child.birthDate)}</td>
                        <td>{otherParent ? animalLabel(otherParent) : <span className="muted">—</span>}</td>
                        <td>
                          <AnimalStatusBadge status={child.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {data.total > OFFSPRING_PAGE && (
              <Pagination
                page={data.page}
                limit={data.limit}
                total={data.total}
                noun="cría(s)"
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </section>
  )
}
