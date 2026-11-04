import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditApi } from '../api/audit.api'
import type { LoginHistoryFilters } from '../types/audit.types'

export const auditKeys = {
  all: ['audit'] as const,
  loginHistory: (filters: LoginHistoryFilters) => [...auditKeys.all, 'login-history', filters] as const,
  userOptions: ['audit', 'user-options'] as const,
}

export function useLoginHistory(filters: LoginHistoryFilters) {
  return useQuery({
    queryKey: auditKeys.loginHistory(filters),
    queryFn: ({ signal }) => auditApi.loginHistory(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useAuditUserOptions(enabled: boolean) {
  return useQuery({
    queryKey: auditKeys.userOptions,
    queryFn: () => auditApi.userOptions(),
    enabled,
    staleTime: 5 * 60_000,
  })
}
