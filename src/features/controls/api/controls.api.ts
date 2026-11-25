import { http } from '@/shared/api/http-client'
import type {
  ControlFilters,
  ControlJustification,
  ControlJustificationFilters,
  ControlsPage,
  ControlsSummary,
  JustifyControlsRequest,
  JustifyControlsResponse,
} from '../types/controls.types'

export const controlsApi = {
  list: (filters: ControlFilters, signal?: AbortSignal) =>
    http<ControlsPage>('/controls', { query: { ...filters }, signal }),

  summary: () => http<ControlsSummary>('/controls/summary'),

  justify: (body: JustifyControlsRequest) =>
    http<JustifyControlsResponse>('/controls/justifications', { method: 'POST', body }),

  justifications: (filters: ControlJustificationFilters) =>
    http<ControlJustification[]>('/controls/justifications', { query: { ...filters } }),
}
