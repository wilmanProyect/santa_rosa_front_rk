import { formatRelative } from '@/shared/lib/format'
import { Icon } from '@/shared/ui'
import { NOTIFICATION_ICONS } from '../lib/notification-url'
import type { AppNotification } from '../types/notifications.types'

interface NotificationItemProps {
  notification: AppNotification
  onOpen(notification: AppNotification): void
}

/** Una notificación (panel de la campana y pantalla completa). Las no leídas van resaltadas. */
export function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const unread = !notification.readAt
  return (
    <li>
      <button
        type="button"
        className={['notification', unread && 'notification--unread'].filter(Boolean).join(' ')}
        onClick={() => onOpen(notification)}
      >
        <span className="notification__icon">
          <Icon name={NOTIFICATION_ICONS[notification.type] ?? 'bell'} size={18} />
        </span>
        <span className="notification__text">
          <strong>{notification.title}</strong>
          <span className="notification__body">{notification.body}</span>
          <span className="notification__time">{formatRelative(notification.createdAt)}</span>
        </span>
        {unread && <span className="notification__dot" aria-label="No leída" />}
      </button>
    </li>
  )
}
