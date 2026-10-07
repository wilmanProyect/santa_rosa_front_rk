/**
 * Códigos de permiso del backend (ver santa_rosa_backend/docs/API.md).
 * Mantener sincronizado con permission-catalog.ts del backend.
 */
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_CHANGE_STATUS: 'users:change-status',
  USERS_ASSIGN_ROLES: 'users:assign-roles',
  USERS_ASSIGN_PERMISSIONS: 'users:assign-permissions',
  USERS_RESET_PASSWORD: 'users:reset-password',
  USERS_DELETE: 'users:delete',

  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  AREAS_READ: 'areas:read',
  AREAS_CREATE: 'areas:create',
  AREAS_UPDATE: 'areas:update',
  AREAS_DELETE: 'areas:delete',

  AUDIT_READ: 'audit:read',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
