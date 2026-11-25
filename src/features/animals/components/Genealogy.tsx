import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatAge } from '@/shared/lib/format'
import { Alert, Icon, Pagination, Spinner } from '@/shared/ui'
import { useAnimals, usePedigree } from '../hooks/useAnimals'
import { animalLabel } from '../lib/animal-label'
import { repeatColor } from '../lib/pedigree'
import { ANIMALS_ROUTES } from '../routes'
import {
  GENERATION_LABELS,
  PEDIGREE_DEFAULT_GENERATIONS,
  PEDIGREE_MAX_GENERATIONS,
  PEDIGREE_MIN_GENERATIONS,
  SEX_LABELS,
  type AnimalDetail,
  type Pedigree,
} from '../types/animal.types'
import { AnimalStatusBadge } from './AnimalBadges'
import { AnimalThumb } from './AnimalThumb'
import { PedigreeTree } from './PedigreeTree'

/** Árbol genealógico (una sola consulta a la API) y la lista de crías. */
export function Genealogy({ animal }: { animal: AnimalDetail }) {
  return (
    <div className="stack">
      <PedigreeSection key={animal.id} animal={animal} />
      <Offspring animal={animal} />
    </div>
  )
}

const percent = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 2 })
/** Hasta 6,25 % (primos hermanos) es un aviso; más, una alerta. */
const INBREEDING_WARNING_LIMIT = 0.0625

function PedigreeSection({ animal }: { animal: AnimalDetail }) {
  const [generations, setGenerations] = useState(PEDIGREE_DEFAULT_GENERATIONS)
  const { data, isPending, isError, error, isFetching } = usePedigree(animal.id, generations)

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Árbol genealógico</h2>
          <p>Pase el mouse sobre una casilla para ver raza, categoría, ABSID y nacimiento.</p>
        </div>
        <div className="pedigree-generations" role="group" aria-label="Generaciones">
          {Array.from(
            { length: PEDIGREE_MAX_GENERATIONS - PEDIGREE_MIN_GENERATIONS + 1 },
            (_, i) => i + PEDIGREE_MIN_GENERATIONS,
          ).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={generations === g}
              title={`${g} generaciones (hasta ${GENERATION_LABELS[g].toLowerCase()})`}
              onClick={() => setGenerations(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </header>
      <div className="card__body stack" aria-busy={isFetching}>
        {isPending && <Spinner />}
        {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
        {data && (
          <>
            <InbreedingNotice pedigree={data} />
            <Completeness pedigree={data} />
            <PedigreeTree
              pedigree={data}
              onExpand={() => setGenerations((g) => Math.min(g + 1, PEDIGREE_MAX_GENERATIONS))}
            />
            {data.repeatedAncestors.length > 0 && <RepeatedLegend pedigree={data} />}
          </>
        )}
      </div>
    </section>
  )
}

function InbreedingNotice({ pedigree }: { pedigree: Pedigree }) {
  const { inbreeding, generations } = pedigree
  if (!inbreeding) return null
  const note = <span className="muted small"> El cálculo solo ve los ancestros registrados.</span>
  if (inbreeding.coefficient <= 0) {
    return (
      <Alert tone="info">
        Sin consanguinidad en {generations} generaciones.{note}
      </Alert>
    )
  }
  const common = inbreeding.commonAncestors.map((a) => animalLabel(a)).join(', ')
  return (
    <Alert tone={inbreeding.coefficient > INBREEDING_WARNING_LIMIT ? 'error' : 'warning'}>
      <strong>Consanguinidad: {percent.format(inbreeding.coefficient)}</strong>
      {inbreeding.relationship && <> — los padres son {inbreeding.relationship}</>}
      {common && <> (ancestro común: {common})</>}.{note}
    </Alert>
  )
}

/** Ancestros conocidos sobre los posibles, por generación: muestra qué falta cargar. */
function Completeness({ pedigree }: { pedigree: Pedigree }) {
  return (
    <div className="pedigree-completeness">
      {pedigree.completeness.map((c) => {
        const ratio = c.possible > 0 ? c.known / c.possible : 0
        return (
          <div key={c.generation} className="pedigree-completeness__row">
            <span className="pedigree-completeness__label">{GENERATION_LABELS[c.generation] ?? `${c.generation}.ª`}</span>
            <span
              className="pedigree-completeness__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={c.possible}
              aria-valuenow={c.known}
              aria-label={`${GENERATION_LABELS[c.generation]}: ${c.known} de ${c.possible}`}
            >
              <span style={{ width: `${Math.round(ratio * 100)}%` }} />
            </span>
            <span className="pedigree-completeness__value">
              {c.known} de {c.possible}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RepeatedLegend({ pedigree }: { pedigree: Pedigree }) {
  return (
    <div className="pedigree-repeated">
      <strong className="small">Ancestros repetidos</strong>
      <ul>
        {pedigree.repeatedAncestors.map((a, i) => (
          <li key={a.id}>
            <span
              className="pedigree-repeated__swatch"
              style={{ background: repeatColor(i) }}
            />
            <Link to={ANIMALS_ROUTES.detail(a.id)}>{animalLabel(a)}</Link>
            <span className="muted small">Aparece {a.occurrences} veces</span>
          </li>
        ))}
      </ul>
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
