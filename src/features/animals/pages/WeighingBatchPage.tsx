import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { formatKg, optional, todayIso } from '@/shared/lib/format'
import {
  Alert,
  Button,
  Icon,
  PageHeader,
  SelectField,
  TextAreaField,
  TextField,
  useToast,
} from '@/shared/ui'
import { ParentPicker } from '../components/ParentPicker'
import { useBatchWeighing } from '../hooks/useWeighings'
import { animalLabel } from '../lib/animal-label'
import { ANIMALS_ROUTES } from '../routes'
import {
  BODY_CONDITION_SCORES,
  SPECIES_LABELS,
  WEIGHING_TYPE_LABELS,
  WEIGHT_LIMITS,
  type AnimalSummary,
  type BatchItemError,
  type Weighing,
  type WeighingType,
} from '../types/animal.types'
import './animals.css'

const MAX_ITEMS = 500

interface Row {
  animal: AnimalSummary
  weightKg: string
  score: string
  isEstimated: boolean
  notes: string
}

/** Jornada de pesaje: varios animales con la misma fecha y motivo (todo o nada). */
export function WeighingBatchPage() {
  const toast = useToast()
  const batch = useBatchWeighing()
  const [weighedAt, setWeighedAt] = useState(todayIso())
  const [type, setType] = useState<WeighingType>('ROUTINE')
  const [nextWeighingAt, setNextWeighingAt] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [itemErrors, setItemErrors] = useState<Map<string, string>>(new Map())
  const [result, setResult] = useState<{ saved: Weighing[]; labels: Map<string, string> } | null>(null)

  function addAnimal(animal: AnimalSummary) {
    if (rows.some((r) => r.animal.id === animal.id)) {
      toast.show(`${animalLabel(animal)} ya está en la lista`, 'info')
      return
    }
    setRows((current) => [...current, { animal, weightKg: '', score: '', isEstimated: false, notes: '' }])
  }

  function patchRow(id: string, changes: Partial<Row>) {
    setRows((current) => current.map((r) => (r.animal.id === id ? { ...r, ...changes } : r)))
    setItemErrors((current) => {
      if (!current.has(id)) return current
      const next = new Map(current)
      next.delete(id)
      return next
    })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setItemErrors(new Map())
    const labels = new Map(rows.map((r) => [r.animal.id, animalLabel(r.animal)]))
    batch.mutate(
      {
        weighedAt,
        type,
        nextWeighingAt: nextWeighingAt || undefined,
        notes: optional(notes),
        items: rows.map((r) => ({
          animalId: r.animal.id,
          weightKg: Number(r.weightKg),
          bodyConditionScore: r.score === '' ? undefined : Number(r.score),
          isEstimated: r.isEstimated || undefined,
          notes: optional(r.notes),
        })),
      },
      {
        onSuccess: (saved) => {
          toast.show(`Jornada guardada: ${saved.length} pesaje(s)`)
          setResult({ saved, labels })
          setRows([])
        },
        onError: (err) => {
          // Todo o nada: el 400 trae los animales que fallaron.
          const errors = err instanceof ApiError ? (err.body.errors as BatchItemError[] | undefined) : undefined
          if (errors?.length) setItemErrors(new Map(errors.map((e) => [e.animalId, e.message])))
        },
      },
    )
  }

  const warned = result?.saved.filter((w) => w.warnings && w.warnings.length > 0) ?? []

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        eyebrow={
          <Link to={ANIMALS_ROUTES.list}>
            <Icon name="arrowLeft" size={14} /> Animales
          </Link>
        }
        title="Jornada de pesaje"
        description="Registre el peso de varios animales con la misma fecha y motivo. Si un animal tiene un problema, no se guarda ninguno: corrija lo marcado y vuelva a guardar."
        actions={
          <Button type="submit" icon="check" loading={batch.isPending} disabled={rows.length === 0}>
            {rows.length > 0 ? `Guardar ${rows.length} pesaje(s)` : 'Guardar'}
          </Button>
        }
      />

      <div className="form-sections">
        {result && (
          <Alert tone={warned.length ? 'warning' : 'info'}>
            <div className="stack stack--sm">
              <strong>Se guardaron {result.saved.length} pesaje(s).</strong>
              {warned.length > 0 && (
                <>
                  <span>Revise estos datos (se guardaron igual):</span>
                  <ul className="m-0" style={{ paddingLeft: 18 }}>
                    {warned.map((w) => (
                      <li key={w.id}>
                        <Link to={ANIMALS_ROUTES.detail(w.animalId)}>{result.labels.get(w.animalId)}</Link>{' '}
                        ({formatKg(w.weightKg)}): {w.warnings!.join(' · ')}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Alert>
        )}
        {batch.isError && <Alert tone="error">{getErrorMessage(batch.error)}</Alert>}

        <section className="card">
          <header className="card__header">
            <h2>Datos comunes</h2>
          </header>
          <div className="card__body grid-2">
            <TextField
              label="Fecha"
              type="date"
              required
              max={todayIso()}
              value={weighedAt}
              onChange={(e) => setWeighedAt(e.target.value)}
            />
            <SelectField
              label="Motivo"
              required
              value={type}
              onChange={(e) => setType(e.target.value as WeighingType)}
            >
              {(Object.keys(WEIGHING_TYPE_LABELS) as WeighingType[]).map((t) => (
                <option key={t} value={t}>
                  {WEIGHING_TYPE_LABELS[t]}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Próximo pesaje"
              hint="Para todos los animales; aparecerá en los recordatorios."
              type="date"
              min={weighedAt || undefined}
              value={nextWeighingAt}
              onChange={(e) => setNextWeighingAt(e.target.value)}
            />
            <TextAreaField
              label="Observación común"
              hint="Se suma a la de cada animal."
              maxLength={500}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <h2>Animales</h2>
              <p>
                {rows.length} de hasta {MAX_ITEMS}. Busque cada animal y cargue su peso.
              </p>
            </div>
          </header>
          <div className="card__body stack">
            <div style={{ maxWidth: 480 }}>
              <ParentPicker
                label="Agregar animal"
                species=""
                anySpecies
                status="ALIVE"
                placeholder="Buscar por arete o nombre"
                value={null}
                disabled={rows.length >= MAX_ITEMS}
                onChange={(_ref, animal) => animal && addAnimal(animal)}
              />
            </div>

            {rows.length === 0 ? (
              <div className="empty">
                <Icon name="animal" size={28} />
                Agregue los animales que se pesan en esta jornada.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Animal</th>
                      <th>Peso (kg)</th>
                      <th>Cond. corporal</th>
                      <th>Estimado</th>
                      <th>Observación</th>
                      <th className="table__actions">
                        <span className="visually-hidden">Quitar</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const error = itemErrors.get(row.animal.id)
                      return (
                        <tr key={row.animal.id} className={error ? 'row--error' : undefined}>
                          <td>
                            <strong>{animalLabel(row.animal)}</strong>
                            <div className="muted small">
                              {SPECIES_LABELS[row.animal.species]} · {row.animal.breed.name}
                            </div>
                            {error && (
                              <div className="small" style={{ color: 'var(--color-danger)' }}>
                                {error}
                              </div>
                            )}
                          </td>
                          <td style={{ width: 130 }}>
                            <input
                              className="input"
                              type="number"
                              inputMode="decimal"
                              required
                              min={WEIGHT_LIMITS.min}
                              max={WEIGHT_LIMITS.max}
                              step={0.01}
                              aria-label={`Peso de ${animalLabel(row.animal)}`}
                              value={row.weightKg}
                              onChange={(e) => patchRow(row.animal.id, { weightKg: e.target.value })}
                            />
                          </td>
                          <td style={{ width: 130 }}>
                            <select
                              className="input"
                              aria-label={`Condición corporal de ${animalLabel(row.animal)}`}
                              value={row.score}
                              onChange={(e) => patchRow(row.animal.id, { score: e.target.value })}
                            >
                              <option value="">—</option>
                              {BODY_CONDITION_SCORES.map((s) => (
                                <option key={s} value={s}>
                                  {s.toLocaleString('es-BO')}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Peso estimado de ${animalLabel(row.animal)}`}
                              checked={row.isEstimated}
                              onChange={(e) => patchRow(row.animal.id, { isEstimated: e.target.checked })}
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
