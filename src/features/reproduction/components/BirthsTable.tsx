import { useNavigate } from 'react-router'
import { ReviewFlag } from '@/features/reviews'
import { formatDate } from '@/shared/lib/format'
import { Badge, Icon } from '@/shared/ui'
import { REPRODUCTION_ROUTES } from '../routes'
import { BIRTH_ASSISTANCE_LABELS, type Birth } from '../types/reproduction.types'
import { AnimalRefLink, LitterBadge } from './ReproductionBadges'

interface BirthsTableProps {
  births: Birth[]
  busy?: boolean
  emptyMessage?: string
}

/** Partos con el número de crías; cada fila abre la ficha del parto. */
export function BirthsTable({ births, busy, emptyMessage = 'No hay partos que coincidan con los filtros.' }: BirthsTableProps) {
  const navigate = useNavigate()

  return (
    <div className="table-wrap" aria-busy={busy}>
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Madre</th>
            <th>Padre</th>
            <th>Crías</th>
            <th>Vivas / muertas</th>
            <th>Tipo de parto</th>
          </tr>
        </thead>
        <tbody>
          {births.length === 0 && (
            <tr>
              <td colSpan={6} className="table__empty">
                <div className="empty">
                  <Icon name="animal" size={28} />
                  {emptyMessage}
                </div>
              </td>
            </tr>
          )}
          {births.map((b) => (
            <tr key={b.id} className="is-clickable" onClick={() => navigate(REPRODUCTION_ROUTES.birthDetail(b.id))}>
              <td className="nowrap">
                {formatDate(b.birthDate)} <ReviewFlag entityType="BIRTH" entityId={b.id} />
                {b.isHistorical && (
                  <div>
                    <span title="Reconstruido de los datos cargados; no tiene monta">
                      <Badge tone="neutral">Histórico</Badge>
                    </span>
                  </div>
                )}
              </td>
              <td>
                <AnimalRefLink animal={b.dam} stopPropagation />
              </td>
              <td>{b.sire ? <AnimalRefLink animal={b.sire} stopPropagation /> : <span className="muted">—</span>}</td>
              <td>
                <LitterBadge type={b.litterType} size={b.litterSize} />
              </td>
              <td className="nowrap">
                {b.bornAlive}
                {b.bornDead > 0 ? <span style={{ color: 'var(--color-danger)' }}> / {b.bornDead}</span> : ' / 0'}
              </td>
              <td>{b.assistance ? BIRTH_ASSISTANCE_LABELS[b.assistance] : <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
