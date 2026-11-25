import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationSettingsApi, notificationsApi } from '../api/notifications.api'
import type { NotificationFilters, UpdateNotificationSettingsRequest } from '../types/notifications.types'

export const notificationsKeys = {
  all: ['notifications'] as const,
  list: (filters: NotificationFilters) => ['notifications', 'list', filters] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  settings: ['notification-settings'] as const,
}

/** Intervalo de la campana mientras la pestaña está visible. */
const POLL_MS = 60_000

/**
 * Número de la campana. Se consulta al cargar, cada 60 s con la pestaña visible (React Query
 * no consulta en segundo plano), al volver a la pestaña y cuando llega un push.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationsKeys.unreadCount,
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

export function useNotifications(filters: NotificationFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: notificationsKeys.list(filters),
    queryFn: ({ signal }) => notificationsApi.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  })
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: notificationsKeys.all })
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications()
  return useMutation({ mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: invalidate })
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications()
  return useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: invalidate })
}

// ---------- Configuración de los controles ----------
export function useNotificationSettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: notificationsKeys.settings,
    queryFn: () => notificationSettingsApi.get(),
    enabled: options.enabled,
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateNotificationSettingsRequest) => notificationSettingsApi.update(body),
    onSuccess: (settings) =>
      Promise.all([
        queryClient.setQueryData(notificationsKeys.settings, settings),
        // Los vencimientos se recalculan con la configuración nueva.
        queryClient.invalidateQueries({ queryKey: ['controls'] }),
      ]),
  })
}

export function useRunNotificationCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationSettingsApi.run(),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationsKeys.settings }),
        queryClient.invalidateQueries({ queryKey: notificationsKeys.all }),
      ]),
  })
}
