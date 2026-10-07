import type { ReactNode } from 'react'
import type { PermissionCode } from '@/shared/config/permissions'
import { useAuth } from '../hooks/useAuth'

interface CanProps {
  /** Se exigen todos los permisos indicados. */
  permissions: PermissionCode[]
  children: ReactNode
  fallback?: ReactNode
}

/** Muestra su contenido solo si el usuario tiene los permisos. */
export function Can({ permissions, children, fallback = null }: CanProps) {
  const { can } = useAuth()
  return can(...permissions) ? children : fallback
}
