import { http } from '@/shared/api/http-client'
import type { Paginated } from '@/shared/types/api.types'
import type {
  AppNotification,
  NotificationFilters,
  NotificationRunResult,
  NotificationSettings,
  PushSubscriptionBody,
  UpdateNotificationSettingsRequest,
} from '../types/notifications.types'

export const notificationsApi = {
  list: (filters: NotificationFilters, signal?: AbortSignal) =>
    http<Paginated<AppNotification>>('/notifications', { query: { ...filters }, signal }),
  unreadCount: () => http<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => http<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => http<{ updated: number }>('/notifications/read-all', { method: 'POST' }),
}

export const pushApi = {
  publicKey: () => http<{ publicKey: string }>('/notifications/push/public-key'),
  subscribe: (body: PushSubscriptionBody) =>
    http<void>('/notifications/push/subscriptions', { method: 'POST', body }),
  unsubscribe: (endpoint: string) =>
    http<void>('/notifications/push/subscriptions', { method: 'DELETE', body: { endpoint } }),
  test: () => http<{ sent: number; failed: number }>('/notifications/push/test', { method: 'POST' }),
}

export const notificationSettingsApi = {
  get: () => http<NotificationSettings>('/notification-settings'),
  update: (body: UpdateNotificationSettingsRequest) =>
    http<NotificationSettings>('/notification-settings', { method: 'PATCH', body }),
  run: () => http<NotificationRunResult>('/notification-settings/run', { method: 'POST' }),
}
