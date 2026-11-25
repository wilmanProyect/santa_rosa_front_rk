import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatDate, formatDateTime } from '@/shared/lib/format'
import { Alert, Badge, Spinner } from '@/shared/ui'
import { useControlJustifications } from '../hooks/useControls'
import { CONTROL_LABELS, CONTROL_PERMISSION, CONTROL_TYPES } from '../types/controls.types'

/** Ficha del animal: controles que se justificaron (no se muestra si no hay ninguno). */
export function AnimalJustificationsCard({ animalId }: { animalId: string }) {
  const { can } = useAuth()
  const canSeeAny = CONTROL_TYPES.some((t) => can(CONTROL_PERMISSION[t]))
  const { data, isPending, isError, error } = useControlJustifications({ animalId }, { enabled: canSeeAny })

  if (!canSeeAny) return null
  if (isPending) return <Spinner />
  if (isError) return <Alert tone="error">{getErrorMessage(error)}</Alert>
  if (data.length === 0) return null

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Controles justificados</h2>
          <p>Destetes, controles de peso y sanitarios que no se hicieron a tiempo, con su motivo.</p>
        </div>
      </header>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Control</th>
              <th>Vencía</th>
              <th>Motivo</th>
              <th>Nueva fecha</th>
              <th>Justificado por</th>
            </tr>
          </thead>
          <tbody>
            {data.map((j) => (
              <tr key={j.id}>
                <td>{CONTROL_LABELS[j.type]}</td>
                <td>{formatDate(j.resolvedDueDate)}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{j.reason}</td>
                <td>{j.nextDueDate ? formatDate(j.nextDueDate) : <Badge>Cerrado</Badge>}</td>
                <td>
                  {j.createdByName ?? '—'}
                  <div className="muted small">{formatDateTime(j.createdAt)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
