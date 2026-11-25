import { useNavigate } from 'react-router'
import { notificationUrl } from '../lib/notification-url'
import type { AppNotification } from '../types/notifications.types'
import { useMarkNotificationRead } from './useNotifications'

/** Al tocar una notificación: se marca como leída y se va a su pantalla. */
export function useOpenNotification() {
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()
  return (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id)
    navigate(notificationUrl(notification.target))
  }
}
