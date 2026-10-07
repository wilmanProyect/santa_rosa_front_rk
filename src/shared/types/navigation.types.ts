import type { PermissionCode } from '@/shared/config/permissions'

export interface NavItem {
  to: string
  label: string
  description: string
  /** El ítem solo se muestra si el usuario tiene todos estos permisos. */
  permissions: PermissionCode[]
}
