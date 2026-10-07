/** Respuesta de los listados paginados del backend. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}

/** Referencia mínima a otra entidad, p. ej. el área de un usuario. */
export interface EntityRef {
  id: string
  name: string
}

/** Campos de auditoría que devuelven los recursos. */
export interface AuditFields {
  createdAt: string
  createdBy: string | null
  updatedAt: string
  updatedBy: string | null
}
