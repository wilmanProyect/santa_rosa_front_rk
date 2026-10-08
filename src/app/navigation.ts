import { AREAS_ROUTES } from '@/features/areas'
import { ROLES_ROUTES } from '@/features/roles'
import { USERS_ROUTES } from '@/features/users'
import { PERMISSIONS } from '@/shared/config/permissions'
import type { NavItem } from '@/shared/types/navigation.types'

/** Menú principal. Al agregar un módulo nuevo, registrarlo aquí y en el router. */
export const NAVIGATION: NavItem[] = [
  { to: '/', label: 'Inicio', description: 'Resumen', icon: 'home', permissions: [] },
  {
    to: USERS_ROUTES.list,
    label: 'Usuarios',
    description: 'Personal, estados, roles y accesos individuales.',
    icon: 'users',
    permissions: [PERMISSIONS.USERS_READ],
  },
  {
    to: ROLES_ROUTES.list,
    label: 'Roles y permisos',
    description: 'Qué puede hacer cada rol dentro del sistema.',
    icon: 'shield',
    permissions: [PERMISSIONS.ROLES_READ],
  },
  {
    to: AREAS_ROUTES.list,
    label: 'Áreas',
    description: 'Áreas de trabajo de la cabaña.',
    icon: 'area',
    permissions: [PERMISSIONS.AREAS_READ],
  },
]
