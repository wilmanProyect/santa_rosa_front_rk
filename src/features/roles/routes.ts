export const ROLES_ROUTES = {
  list: '/roles',
  create: '/roles/nuevo',
  /** Patrón para el router. */
  detailPattern: '/roles/:roleId',
  detail: (id: string) => `/roles/${id}`,
} as const
