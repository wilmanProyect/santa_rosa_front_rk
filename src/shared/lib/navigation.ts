import type { PermissionCode } from '@/shared/config/permissions'
import type { NavItem } from '@/shared/types/navigation.types'

type Can = (...permissions: PermissionCode[]) => boolean

/** Si el usuario ve el ítem: todos los `permissions` y, si hay, al menos uno de `anyPermissions`. */
export function isNavItemAllowed(item: Pick<NavItem, 'permissions' | 'anyPermissions'>, can: Can): boolean {
  if (!can(...item.permissions)) return false
  return !item.anyPermissions?.length || item.anyPermissions.some((p) => can(p))
}
