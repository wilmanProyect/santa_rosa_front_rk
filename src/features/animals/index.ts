// API pública de la feature de animales (incluye catálogos de razas/colores y fotos).
export { AnimalsPage } from './pages/AnimalsPage'
export { AnimalDetailPage, type AnimalExtraTab } from './pages/AnimalDetailPage'
export { WeighingBatchPage } from './pages/WeighingBatchPage'
export { AnimalFormPage } from './pages/AnimalFormPage'
export { CatalogsPage } from './pages/CatalogsPage'
export { ANIMALS_ROUTES } from './routes'
export { ParentPicker as AnimalPicker } from './components/ParentPicker'
export { animalLabel } from './lib/animal-label'
export { GeneticCategoryText } from './components/GeneticCategory'
export { geneticCategoryShort } from './lib/genetic-category'
export { AnimalFlags, AnimalStatusBadge } from './components/AnimalBadges'
export { useAnimal, useAnimals, animalsKeys } from './hooks/useAnimals'
export { useBreeds, useColors } from './hooks/useCatalogs'
export { animalsApi, catalogsApi, photosApi, weighingsApi } from './api/animals.api'
export {
  ANIMAL_ERROR_CODES,
  GENETIC_CATEGORY_LABELS,
  SEX_LABELS,
  SPECIES_LABELS,
  WEIGHT_LIMITS,
} from './types/animal.types'
export type * from './types/animal.types'
