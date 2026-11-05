/**
 * Códigos de permiso del backend (ver docs/FRONTEND.md, sección 3).
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

  ANIMALS_READ: 'animals:read',
  ANIMALS_CREATE: 'animals:create',
  ANIMALS_UPDATE: 'animals:update',
  ANIMALS_CHANGE_STATUS: 'animals:change-status',
  ANIMALS_DELETE: 'animals:delete',
  ANIMALS_ISSUE_CERTIFICATE: 'animals:issue-certificate',
  ANIMAL_CATALOGS_MANAGE: 'animal-catalogs:manage',
  ANIMAL_PHOTOS_UPLOAD: 'animal-photos:upload',
  ANIMAL_PHOTOS_DELETE: 'animal-photos:delete',

  WEIGHINGS_WRITE: 'weighings:write',

  HEALTH_READ: 'health:read',
  HEALTH_WRITE: 'health:write',
  HEALTH_OVERRIDE_WITHDRAWAL: 'health:override-withdrawal',
  VETERINARY_PRODUCTS_MANAGE: 'veterinary-products:manage',

  AUDIT_READ: 'audit:read',
  BACKUPS_CREATE: 'backups:create',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
