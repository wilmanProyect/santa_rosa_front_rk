import { CONTROLS_ROUTES } from '@/features/controls'
import { REPRODUCTION_ROUTES } from '@/features/reproduction'
import { NOTIFICATIONS_ROUTES } from '../routes'
import type { NotificationTarget, NotificationType } from '../types/notifications.types'
import type { IconName } from '@/shared/ui'

/** Pantalla a la que lleva una notificación (`public/sw.js` repite estas reglas). */
export function notificationUrl(target: NotificationTarget | null): string {
  if (target?.type === 'BREEDING_SERVICE' && target.id) return REPRODUCTION_ROUTES.serviceDetail(target.id)
  if (target?.type === 'CONTROLS') return CONTROLS_ROUTES.forType(target.filter ?? 'WEANING')
  return NOTIFICATIONS_ROUTES.list
}

export const NOTIFICATION_ICONS: Record<NotificationType, IconName> = {
  BIRTH_UPCOMING: 'heart',
  WEANING_DUE: 'baby',
  WEIGHING_DUE: 'scale',
  HEALTH_DUE: 'shield',
}
