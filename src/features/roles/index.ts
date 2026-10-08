// API pública de la feature de roles y permisos.
export { RolesPage } from './pages/RolesPage'
export { RoleEditorPage } from './pages/RoleEditorPage'
export { ROLES_ROUTES } from './routes'
export { rolesApi } from './api/roles.api'
export { useRoles, useRole, usePermissionCatalog, rolesKeys } from './hooks/useRoles'
export { groupPermissionsByModule, type PermissionGroup } from './lib/group-permissions'
export type * from './types/role.types'
