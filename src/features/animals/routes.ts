export const ANIMALS_ROUTES = {
  list: '/animales',
  /** `?externo=1` abre el formulario de reproductor externo. */
  create: '/animales/nuevo',
  detailPattern: '/animales/:animalId',
  detail: (id: string) => `/animales/${id}`,
  editPattern: '/animales/:animalId/editar',
  edit: (id: string) => `/animales/${id}/editar`,
  catalogs: '/catalogos',
  weighingBatch: '/pesajes/jornada',
} as const
