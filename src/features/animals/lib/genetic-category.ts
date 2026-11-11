import type { GeneticCategory } from '../types/animal.types'

/** Código corto de la categoría: "G1", "PO", "Base", "Comercial". */
export function geneticCategoryShort(category: GeneticCategory): string {
  if (category === 'BASE') return 'Base'
  if (category === 'COMMERCIAL') return 'Comercial'
  return category
}
