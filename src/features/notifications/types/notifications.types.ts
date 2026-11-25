import type { ControlCounts, ControlType } from '@/features/controls'
import type { PaginationParams } from '@/shared/types/api.types'

export type NotificationType = 'BIRTH_UPCOMING' | 'WEANING_DUE' | 'WEIGHING_DUE' | 'HEALTH_DUE'

export interface NotificationTarget {
  type: 'BREEDING_SERVICE' | 'CONTROLS'
  /** Id de la monta (BREEDING_SERVICE). */
  id: string | null
  /** Tipo de control (CONTROLS). */
  filter: ControlType | null
}

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  target: NotificationTarget | null
  createdAt: string
  readAt: string | null
}

export interface NotificationFilters extends PaginationParams {
  unreadOnly?: boolean
}

export interface NotificationSettings {
  /** 1–24 */
  weighingIntervalMonths: number
  /** 1–24 */
  healthIntervalMonths: number
  /** 1–12 */
  weaningAgeMonths: number
  /** No futura. */
  weaningTrackingFrom: string
  /** 1–30 */
  upcomingDays: number
  /** 0–23, hora de la cabaña. */
  runHour: number
  lastRunOn: string | null
  updatedAt: string
  updatedBy: string | null
}

export type UpdateNotificationSettingsRequest = Partial<
  Pick<
    NotificationSettings,
    'weighingIntervalMonths' | 'healthIntervalMonths' | 'weaningAgeMonths' | 'weaningTrackingFrom' | 'upcomingDays' | 'runHour'
  >
>

export interface NotificationRunResult {
  date: string
  births: number
  created: number
  purged: number
  controls: Partial<Record<ControlType, ControlCounts & { notified: boolean }>>
}

/** Suscripción del navegador (`PushSubscription.toJSON()`). */
export interface PushSubscriptionBody {
  endpoint: string
  keys: { p256dh: string; auth: string }
}
