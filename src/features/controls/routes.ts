import type { ControlType } from './types/controls.types'

export const CONTROLS_ROUTES = {
  page: '/controles',
  forType: (type: ControlType) => `/controles?tipo=${type}`,
} as const
