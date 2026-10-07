import { Badge } from '@/shared/ui'
import { INACTIVE_REASON_LABELS, type UserSummary } from '../types/user.types'

export function UserStatusBadge({ user }: { user: Pick<UserSummary, 'status' | 'inactiveReason'> }) {
  if (user.status === 'ACTIVE') {
    return <Badge tone="success">Activo</Badge>
  }
  const reason = user.inactiveReason ? INACTIVE_REASON_LABELS[user.inactiveReason] : null
  return <Badge tone="danger">{reason ? `Inactivo · ${reason}` : 'Inactivo'}</Badge>
}
