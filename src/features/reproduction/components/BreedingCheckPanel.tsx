import { Link } from 'react-router'
import { geneticCategoryShort } from '@/features/animals'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatDate } from '@/shared/lib/format'
import { Alert, Icon, Spinner } from '@/shared/ui'
import { REPRODUCTION_ROUTES } from '../routes'
import type { BreedingEvaluation } from '../types/reproduction.types'
import { KinshipDetails } from './KinshipDetails'

interface BreedingCheckPanelProps {
  evaluation: BreedingEvaluation | undefined
  loading: boolean
  error: unknown
}

/** Resultado de POST /breeding/check: bloqueos, avisos, categoría esperada, parto probable y parentesco. */
export function BreedingCheckPanel({ evaluation, loading, error }: BreedingCheckPanelProps) {
  if (error) return <Alert tone="error">No se pudo revisar la pareja: {getErrorMessage(error)}</Alert>
  if (!evaluation) return loading ? <Spinner label="Revisando la pareja…" /> : null

  const { blocks, warnings, kinship } = evaluation

  return (
    <section className="check-panel" aria-live="polite" aria-busy={loading}>
      <header className="check-panel__header">
        <h3>Revisión de la pareja</h3>
        {loading ? (
          <span className="muted small">Actualizando…</span>
        ) : evaluation.allowed ? (
          <span className="check-panel__ok">
            <Icon name="check" size={16} /> Se puede registrar
          </span>
        ) : null}
      </header>

      {blocks.map((block) => (
        <Alert key={block.code} tone="error">
          <strong>{block.message}</strong>
          {block.code === 'OPEN_SERVICE' && block.serviceId && (
            <>
              {' '}
              <Link to={REPRODUCTION_ROUTES.serviceDetail(block.serviceId)}>Ver la monta abierta</Link>
            </>
          )}
        </Alert>
      ))}

      {warnings.map((warning) => (
        <Alert key={warning} tone="warning">
          {warning}
        </Alert>
      ))}

      <dl className="data-list">
        <div>
          <dt>Cría esperada</dt>
          <dd>
            {evaluation.expectedOffspringCategory ? (
              <>
                La cría será <strong>{geneticCategoryShort(evaluation.expectedOffspringCategory)}</strong>
                {evaluation.categoryUpgrade && <span className="check-panel__up"> ↑ sube de categoría</span>}
              </>
            ) : (
              <span className="muted">No se calcula: se carga a mano al nacer</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Parto probable</dt>
          <dd>{formatDate(evaluation.expectedBirthDate)}</dd>
        </div>
        <div>
          <dt>Ancestros conocidos</dt>
          <dd>
            Hembra {kinship.knownAncestors.dam} · Macho {kinship.knownAncestors.sire}
            <span className="muted small"> (de {kinship.knownAncestors.possible} posibles)</span>
          </dd>
        </div>
      </dl>

      {kinship.related ? (
        <Alert tone="error">
          <KinshipDetails kinship={kinship} />
        </Alert>
      ) : (
        <p className="m-0 muted small">Sin parentesco en la genealogía registrada (3 generaciones).</p>
      )}
    </section>
  )
}
