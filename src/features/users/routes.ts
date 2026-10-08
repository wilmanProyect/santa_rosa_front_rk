export const USERS_ROUTES = {
  list: '/usuarios',
  /** Patrón para el router. */
  detailPattern: '/usuarios/:userId',
  detail: (id: string) => `/usuarios/${id}`,
} as const
