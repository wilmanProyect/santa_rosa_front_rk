import type { PermissionCode } from '@/shared/config/permissions'
import type { IconName } from '@/shared/ui/Icon'

export interface NavItem {
  to: string
  label: string
  description: string
  icon: IconName
  /** Sección del menú lateral; sin grupo va arriba de todo. */
  group?: string
  /** `settings`: va en el menú del engranaje (junto al usuario), no en el menú principal. */
  placement?: 'settings'
  /** El ítem solo se muestra si el usuario tiene todos estos permisos. */
  permissions: PermissionCode[]
}
