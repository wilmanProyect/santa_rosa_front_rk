import { Link } from 'react-router'
import { ANIMALS_ROUTES, animalLabel } from '@/features/animals'
import { formatInbreeding } from '../lib/reproduction-format'
import type { KinshipDetail } from '../types/reproduction.types'

/** Relación, consanguinidad de la cría y ancestros comunes (con enlace a su ficha). */
export function KinshipDetails({ kinship }: { kinship: KinshipDetail }) {
  return (
    <div className="stack stack--sm">
      <div>
        {kinship.relationship && (
          <>
            Emparentados: <strong>{kinship.relationship}</strong> ·{' '}
          </>
        )}
        Consanguinidad de la cría: <strong>{formatInbreeding(kinship.inbreedingCoefficient)}</strong>
      </div>
      {kinship.commonAncestors.length > 0 && (
        <ul className="kinship-list">
          {kinship.commonAncestors.map((a) => (
            <li key={a.id}>
              <Link to={ANIMALS_ROUTES.detail(a.id)}>{animalLabel(a)}</Link>
              <span className="muted small"> — {a.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
