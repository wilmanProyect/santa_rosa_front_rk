import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { controlsApi } from '../api/controls.api'
import type { ControlFilters, ControlJustificationFilters, JustifyControlsRequest } from '../types/controls.types'

/**
 * La raíz `['controls']` la invalidan también los pesajes y los registros sanitarios
 * (con la clave literal, para no depender de esta feature).
 */
export const controlsKeys = {
  all: ['controls'] as const,
  list: (filters: ControlFilters) => ['controls', 'list', filters] as const,
  summary: ['controls', 'summary'] as const,
  justifications: (filters: ControlJustificationFilters) => ['controls', 'justifications', filters] as const,
}

export function useControls(filters: ControlFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: controlsKeys.list(filters),
    queryFn: ({ signal }) => controlsApi.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  })
}

export function useControlsSummary(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: controlsKeys.summary,
    queryFn: () => controlsApi.summary(),
    enabled: options.enabled,
  })
}

export function useControlJustifications(filters: ControlJustificationFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: controlsKeys.justifications(filters),
    queryFn: () => controlsApi.justifications(filters),
    enabled: options.enabled,
  })
}

export function useJustifyControls() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: JustifyControlsRequest) => controlsApi.justify(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: controlsKeys.all }),
  })
}
