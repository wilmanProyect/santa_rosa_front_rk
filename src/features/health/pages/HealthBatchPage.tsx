import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AnimalPicker, animalLabel, type AnimalSummary, type BatchItemError, type Species } from '@/features/animals'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { formatDate, optional } from '@/shared/lib/format'
import { Alert, Button, Icon, PageHeader, useToast } from '@/shared/ui'
import { HealthFields } from '../components/HealthFields'
import { useBatchHealthRecords } from '../hooks/useHealth'
import { buildHealthFields, emptyHealthForm, validateHealthForm } from '../lib/health-form'
import { HEALTH_ROUTES } from '../routes'
import { HEALTH_EVENT_LABELS } from '../types/health.types'

const MAX_ITEMS = 500
const SPECIES_SHORT: Record<Species, string> = { SHEEP: 'Ovino', GOAT: 'Caprino' }

interface Row {
  animal: AnimalSummary
  doseQuantity: string
  notes: string
}

/** Aplicación masiva: el mismo evento para un lote de animales (todo o nada). */
export function HealthBatchPage() {
  const toast = useToast()
  const batch = useBatchHealthRecords()
  const [values, setValues] = useState(() => emptyHealthForm('VACCINATION'))
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [itemErrors, setItemErrors] = useState<Map<string, string>>(new Map())
  const [done, setDone] = useState<{ count: number; withdrawalEndsOn: string | null } | null>(null)

  // Si todos los animales son de la misma especie, se filtran los productos autorizados para ella.
  const speciesSet = new Set(rows.map((r) => r.animal.species))
  const species = speciesSet.size === 1 ? [...speciesSet][0] : undefined
  const latestBirth = rows.map((r) => r.animal.birthDate).filter(Boolean).sort().pop() ?? null

  function addAnimal(animal: AnimalSummary) {
    if (rows.some((r) => r.animal.id === animal.id)) {
      toast.show(`${animalLabel(animal)} ya está en la lista`, 'info')
      return
    }
    setRows((current) => [...current, { animal, doseQuantity: '', notes: '' }])
  }

  function patchRow(id: string, changes: Partial<Row>) {
    setRows((current) => current.map((r) => (r.animal.id === id ? { ...r, ...changes } : r)))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setItemErrors(new Map())
    const problem = validateHealthForm(values)
    if (problem) {
      setError(problem)
      return
    }
    batch.mutate(
      {
        ...buildHealthFields(values),
        items: rows.map((r) => ({
          animalId: r.animal.id,
          // La dosis de cada animal reemplaza a la común.
          doseQuantity: r.doseQuantity === '' ? undefined : Number(r.doseQuantity),
          notes: optional(r.notes),
        })),
      },
      {
        onSuccess: (saved) => {
          toast.show(`${HEALTH_EVENT_LABELS[values.type]}: ${saved.length} animal(es) registrados`)
          setDone({ count: saved.length, withdrawalEndsOn: saved[0]?.meatWithdrawalEndsOn ?? null })
          setRows([])
        },
        onError: (err) => {
          const errors = err instanceof ApiError ? (err.body.errors as BatchItemError[] | undefined) : undefined
          if (errors?.length) setItemErrors(new Map(errors.map((e) => [e.animalId, e.message])))
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        eyebrow={
          <Link to={HEALTH_ROUTES.records}>
            <Icon name="arrowLeft" size={14} /> Registro sanitario
          </Link>
        }
        title="Aplicación masiva"
        description="El mismo evento (vacunación, desparasitación, esquila…) para un lote de animales. Si un animal tiene un problema, no se guarda ninguno: corrija lo marcado y vuelva a guardar."
        actions={
          <Button type="submit" icon="check" loading={batch.isPending} disabled={rows.length === 0}>
            {rows.length > 0 ? `Registrar para ${rows.length} animal(es)` : 'Registrar'}
          </Button>
        }
      />

      <div className="form-sections">
        {done && (
          <Alert tone="info">
            Se registró el evento para {done.count} animal(es).
            {done.withdrawalEndsOn && <> No se pueden faenar hasta el {formatDate(done.withdrawalEndsOn)}.</>}
          </Alert>
        )}
        {(error || batch.isError) && <Alert tone="error">{error ?? getErrorMessage(batch.error)}</Alert>}

        <section className="card">
          <header className="card__header">
            <h2>Evento</h2>
          </header>
          <div className="card__body stack">
            <HealthFields
              values={values}
              onChange={setValues}
              species={species}
              minDate={latestBirth}
              animalEventsOnly
              doseLabel="Dosis común"
            />
          </div>
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <h2>Animales</h2>
              <p>
                {rows.length} de hasta {MAX_ITEMS}. La dosis de un animal reemplaza a la común.
              </p>
            </div>
          </header>
          <div className="card__body stack">
            <div style={{ maxWidth: 480 }}>
              <AnimalPicker
                label="Agregar animal"
                species=""
                anySpecies
                status="ALIVE"
                value={null}
                disabled={rows.length >= MAX_ITEMS}
                onChange={(_ref, animal) => animal && addAnimal(animal)}
              />
            </div>

            {rows.length === 0 ? (
              <div className="empty">
                <Icon name="animal" size={28} />
                Agregue los animales del lote.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Animal</th>
                      <th>Dosis propia</th>
                      <th>Observación</th>
                      <th className="table__actions">
                        <span className="visually-hidden">Quitar</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const rowError = itemErrors.get(row.animal.id)
                      return (
                        <tr key={row.animal.id} className={rowError ? 'row--error' : undefined}>
                          <td>
                            <strong>{animalLabel(row.animal)}</strong>
                            <div className="muted small">
                              {SPECIES_SHORT[row.animal.species]} · {row.animal.breed.name}
                            </div>
                            {rowError && (
                              <div className="small" style={{ color: 'var(--color-danger)' }}>
                                {rowError}
                              </div>
                            )}
                          </td>
                          <td style={{ width: 140 }}>
                            <input
                              className="input"
                              type="number"
                              inputMode="decimal"
                              min={0.01}
                              step={0.01}
                              placeholder="Común"
                              aria-label={`Dosis de ${animalLabel(row.animal)}`}
                              value={row.doseQuantity}
                              onChange={(e) => patchRow(row.animal.id, { doseQuantity: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              maxLength={1000}
                              aria-label={`Observación de ${animalLabel(row.animal)}`}
                              value={row.notes}
                              onChange={(e) => patchRow(row.animal.id, { notes: e.target.value })}
                            />
                          </td>
                          <td className="table__actions">
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              title="Quitar de la lista"
                              aria-label={`Quitar ${animalLabel(row.animal)}`}
                              onClick={() => setRows((c) => c.filter((r) => r.animal.id !== row.animal.id))}
                            >
                              <Icon name="close" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </form>
  )
}
