import { useNavigate } from 'react-router'
import { geneticCategoryShort } from '@/features/animals'
import { ReviewFlag } from '@/features/reviews'
import { formatDate } from '@/shared/lib/format'
import { Icon } from '@/shared/ui'
import { REPRODUCTION_ROUTES } from '../routes'
import {
  PREGNANCY_CHECK_RESULT_LABELS,
  SERVICE_TYPE_LABELS,
  type BreedingService,
} from '../types/reproduction.types'
import { AnimalRefLink, KinshipOverrideBadge, ServiceStatusBadge } from './ReproductionBadges'

interface BreedingServicesTableProps {
  services: BreedingService[]
  busy?: boolean
  emptyMessage?: string
}

/** Montas con su estado; cada fila abre la ficha de la monta. */
export function BreedingServicesTable({
  services,
  busy,
  emptyMessage = 'No hay montas que coincidan con los filtros.',
}: BreedingServicesTableProps) {
  const navigate = useNavigate()

  return (
    <div className="table-wrap" aria-busy={busy}>
      <table className="table">
        <thead>
          <tr>
            <th>Ingreso</th>
            <th>Salida</th>
            <th>Hembra</th>
            <th>Macho</th>
            <th>Tipo</th>
            <th>Ecografía</th>
            <th>Estado</th>
            <th>Parto probable</th>
            <th>Cría esperada</th>
          </tr>
        </thead>
        <tbody>
          {services.length === 0 && (
            <tr>
              <td colSpan={9} className="table__empty">
                <div className="empty">
                  <Icon name="heart" size={28} />
                  {emptyMessage}
                </div>
              </td>
            </tr>
          )}
          {services.map((s) => {
            const open = s.status === 'PENDING' || s.status === 'PREGNANT'
            return (
              <tr
                key={s.id}
                className="is-clickable"
                onClick={() => navigate(REPRODUCTION_ROUTES.serviceDetail(s.id))}
              >
                <td className="nowrap">
                  {formatDate(s.serviceDate)} <ReviewFlag entityType="BREEDING_SERVICE" entityId={s.id} />
                </td>
                <td className="nowrap">{s.exitDate ? formatDate(s.exitDate) : <span className="muted">—</span>}</td>
                <td>
                  <AnimalRefLink animal={s.dam} showCategory stopPropagation />
                </td>
                <td>
                  <AnimalRefLink animal={s.sire} showCategory stopPropagation />
                </td>
                <td>
                  {SERVICE_TYPE_LABELS[s.type]}
                  {s.strawCode && <div className="muted small">Pajuela {s.strawCode}</div>}
                </td>
                <td>
                  <CheckSummary service={s} />
                </td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    <ServiceStatusBadge status={s.status} />
                    {s.kinshipOverride && <KinshipOverrideBadge />}
                  </div>
                </td>
                <td className="nowrap">{open ? formatDate(s.expectedBirthDate) : <span className="muted">—</span>}</td>
                <td>
                  {s.expectedOffspringCategory ? (
                    geneticCategoryShort(s.expectedOffspringCategory)
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Último diagnóstico de preñez (ecografía u observación). */
function CheckSummary({ service }: { service: BreedingService }) {
  const last = service.checks.at(-1)
  if (!last) return <span className="muted">—</span>
  return (
    <div className="nowrap">
      {PREGNANCY_CHECK_RESULT_LABELS[last.result]}
      {last.fetusCount && ` · ${last.fetusCount} ${last.fetusCount === 1 ? 'feto' : 'fetos'}`}
      <div className="muted small">
        {formatDate(last.checkedAt)}
        {last.method === 'OBSERVATION' && ' · observación'}
      </div>
    </div>
  )
}
