import type { ReviewEntityType } from './types/review.types'

export const REVIEWS_ROUTES = {
  list: '/revisiones',
} as const

/**
 * Ficha de cada registro. Se repiten las rutas de `animals` y `reproduction` en
 * lugar de importarlas porque esas features muestran el aviso de revisión (se
 * evita la dependencia circular). Mantener sincronizado con sus `routes.ts`.
 */
export const REVIEW_TARGET_PATH: Record<ReviewEntityType, (id: string) => string> = {
  ANIMAL: (id) => `/animales/${id}`,
  BIRTH: (id) => `/reproduccion/partos/${id}`,
  BREEDING_SERVICE: (id) => `/reproduccion/montas/${id}`,
}
