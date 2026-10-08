import type { PermissionCode } from '@/shared/config/permissions'
import type { IconName } from '@/shared/ui/Icon'

export interface NavItem {
  to: string
  label: string
  description: string
  icon: IconName
  /** El ítem solo se muestra si el usuario tiene todos estos permisos. */
  permissions: PermissionCode[]
}
