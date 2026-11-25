import { Outlet } from 'react-router'
import type { PermissionCode } from '@/shared/config/permissions'
import { isNavItemAllowed } from '@/shared/lib/navigation'
import { Alert } from '@/shared/ui'
import { useAuth } from '../hooks/useAuth'

interface RequirePermissionProps {
  /** Exige todos estos permisos. */
  permissions?: PermissionCode[]
  /** Además, exige al menos uno de estos. */
  anyPermissions?: PermissionCode[]
}

/** Protege una ruta exigiendo permisos. Se usa como layout route. */
export function RequirePermission({ permissions = [], anyPermissions }: RequirePermissionProps) {
  const { can } = useAuth()

  if (!isNavItemAllowed({ permissions, anyPermissions }, can)) {
    return <Alert tone="error">No tiene permisos para ver esta sección.</Alert>
  }
  return <Outlet />
}
