import { Outlet } from 'react-router'
import type { PermissionCode } from '@/shared/config/permissions'
import { Alert } from '@/shared/ui'
import { useAuth } from '../hooks/useAuth'

/** Protege una ruta exigiendo permisos. Se usa como layout route. */
export function RequirePermission({ permissions }: { permissions: PermissionCode[] }) {
  const { can } = useAuth()

  if (!can(...permissions)) {
    return <Alert tone="error">No tiene permisos para ver esta sección.</Alert>
  }
  return <Outlet />
}
