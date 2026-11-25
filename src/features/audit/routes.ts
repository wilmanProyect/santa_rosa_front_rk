export const AUDIT_ROUTES = {
  loginHistory: '/auditoria',
  activity: '/auditoria?tab=actividad',
  /** Todo lo que se guardó en una misma petición (p. ej. un parto con sus crías). */
  operation: (requestId: string) => `/auditoria?tab=actividad&operacion=${requestId}`,
} as const
