// API pública de la feature de roles y permisos.
export { RolesPage } from './pages/RolesPage'
export { ROLES_ROUTES } from './routes'
export { rolesApi } from './api/roles.api'
export { useRoles, usePermissionCatalog, rolesKeys } from './hooks/useRoles'
export type * from './types/role.types'
