import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDate, formatKg } from '@/shared/lib/format'
import { Alert, Badge, Button, ConfirmDialog, DataItem, Icon, Spinner, useToast } from '@/shared/ui'
import { useDeleteWeighing, useWeighings } from '../../hooks/useWeighings'
import { WEIGHING_TYPE_LABELS, type AnimalDetail, type Weighing } from '../../types/animal.types'
import { GrowthChart } from './GrowthChart'
import { WeighingFormDialog } from './WeighingFormDialog'

/** Edad en días a texto corto: "45 d", "8 m", "2 a 3 m". */
function shortAge(days: number | null | undefined): string {
  if (days == null) return '—'
  if (days < 60) return `${days} d`
  const months = Math.floor(days / 30.44)
  if (months < 24) return `${months} m`
  const years = Math.floor(months / 12)
  return months % 12 ? `${years} a ${months % 12} m` : `${years} a`
}

const signed = (value: number, unit: string) =>
  `${value > 0 ? '+' : ''}${value.toLocaleString('es-BO', { maximumFractionDigits: 2 })} ${unit}`

/** Historial de pesajes del animal: resumen, curva de crecimiento y tabla. */
export function WeighingsPanel({ animal }: { animal: AnimalDetail }) {
  const { can } = useAuth()
  const toast = useToast()
  const { data: weighings, isPending, isError, error } = useWeighings(animal.id)
  const remove = useDeleteWeighing()
  const [editing, setEditing] = useState<Weighing | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Weighing | null>(null)

  const canWrite = can(PERMISSIONS.WEIGHINGS_WRITE) && !animal.isExternal
  const alive = animal.status === 'ALIVE'

  function openForm(weighing: Weighing | null) {
    setEditing(weighing)
    setFormOpen(true)
  }

  if (animal.isExternal) {
    return <Alert tone="info">Los reproductores externos no se pesan.</Alert>
  }

  // La tabla se lee de lo más reciente a lo más antiguo; la curva, al revés.
  const rows = [...(weighings ?? [])].reverse()

  return (
    <div className="stack">
      <section className="card">
        <header className="card__header">
          <div>
            <h2>Pesos</h2>
            <p>El peso al nacer y al destete salen de los pesajes de ese tipo.</p>
          </div>
          {canWrite && alive && (
            <Button icon="plus" onClick={() => openForm(null)}>
              Registrar pesaje
            </Button>
          )}
        </header>
        <div className="card__body">
          <dl className="data-list">
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
          </dl>
        </div>
      </section>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {weighings && weighings.length === 0 && (
        <div className="card empty">
          <Icon name="activity" size={28} />
          Todavía no tiene pesajes registrados.
        </div>
      )}

      {weighings && weighings.length > 0 && (
        <>
          <section className="card">
            <header className="card__header">
              <div>
                <h2>Curva de crecimiento</h2>
                <p>Peso (kg) en cada pesaje.</p>
              </div>
            </header>
            <div className="card__body">
              <GrowthChart weighings={weighings} />
            </div>
          </section>

          <div className="table-wrap">
            <table className="table">
              <caption className="visually-hidden">Historial de pesajes</caption>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Motivo</th>
                  <th>Edad</th>
                  <th style={{ textAlign: 'right' }}>Peso</th>
                  <th style={{ textAlign: 'right' }}>Cambio</th>
                  <th style={{ textAlign: 'right' }}>Ganancia diaria</th>
                  <th>Cond. corporal</th>
                  <th>Próximo</th>
                  {canWrite && (
                    <th className="table__actions">
                      <span className="visually-hidden">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id}>
                    <td className="nowrap">{formatDate(w.weighedAt)}</td>
                    <td>
                      {WEIGHING_TYPE_LABELS[w.type]}
                      {w.notes && <div className="muted small">{w.notes}</div>}
                    </td>
                    <td className="nowrap muted">{shortAge(w.ageDays)}</td>
                    <td className="nowrap" style={{ textAlign: 'right' }}>
                      <strong>{formatKg(w.weightKg)}</strong>
                      {w.isEstimated && (
                        <div>
                          <Badge tone="neutral">Estimado</Badge>
                        </div>
                      )}
                    </td>
                    <td className="nowrap muted" style={{ textAlign: 'right' }}>
                      {w.changeKg != null ? signed(w.changeKg, 'kg') : '—'}
                    </td>
                    <td className="nowrap muted" style={{ textAlign: 'right' }}>
                      {w.dailyGainG != null ? signed(w.dailyGainG, 'g/día') : '—'}
                    </td>
                    <td>{w.bodyConditionScore != null ? w.bodyConditionScore.toLocaleString('es-BO') : '—'}</td>
                    <td className="nowrap">{w.nextWeighingAt ? formatDate(w.nextWeighingAt) : '—'}</td>
                    {canWrite && (
                      <td className="table__actions">
                        <div className="row">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Corregir"
                            aria-label={`Corregir pesaje del ${formatDate(w.weighedAt)}`}
                            onClick={() => openForm(w)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--danger"
                            title="Eliminar"
                            aria-label={`Eliminar pesaje del ${formatDate(w.weighedAt)}`}
                            onClick={() => {
                              remove.reset()
                              setDeleting(w)
                            }}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <WeighingFormDialog
        open={formOpen}
        animal={animal}
        weighing={editing}
        existing={weighings ?? []}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar pesaje"
        message={
          deleting && (
            <>
              ¿Eliminar el pesaje del {formatDate(deleting.weighedAt)} ({formatKg(deleting.weightKg)})?
              {(deleting.type === 'BIRTH' || deleting.type === 'WEANING') &&
                ' La ficha dejará de mostrar ese peso.'}
            </>
          )
        }
        confirmLabel="Eliminar"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(
            { animalId: animal.id, id: deleting.id },
            {
              onSuccess: () => {
                toast.show('Pesaje eliminado')
                setDeleting(null)
              },
            },
          )
        }
      />
    </div>
  )
}
