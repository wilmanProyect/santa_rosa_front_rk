export const REPRODUCTION_ROUTES = {
  services: '/reproduccion',
  /** `?hembra=<id>` precarga la hembra. */
  newService: '/reproduccion/montas/nueva',
  serviceDetailPattern: '/reproduccion/montas/:serviceId',
  serviceDetail: (id: string) => `/reproduccion/montas/${id}`,
  births: '/reproduccion/partos',
  /** `?monta=<id>`: parto de esa monta. `?hembra=<id>`: parto sin monta con la hembra precargada. */
  newBirth: '/reproduccion/partos/nuevo',
  newBirthForService: (serviceId: string) => `/reproduccion/partos/nuevo?monta=${serviceId}`,
  birthDetailPattern: '/reproduccion/partos/:birthId',
  birthDetail: (id: string) => `/reproduccion/partos/${id}`,
  stats: '/reproduccion/indicadores',
} as const
