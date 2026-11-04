import { ANIMALS_ROUTES } from '@/features/animals'
import { AREAS_ROUTES } from '@/features/areas'
import { AUDIT_ROUTES } from '@/features/audit'
import { HEALTH_ROUTES } from '@/features/health'
import { ROLES_ROUTES } from '@/features/roles'
import { USERS_ROUTES } from '@/features/users'
import { PERMISSIONS } from '@/shared/config/permissions'
import type { NavItem } from '@/shared/types/navigation.types'

/** Menú principal. Al agregar un módulo nuevo, registrarlo aquí y en el router. */
export const NAVIGATION: NavItem[] = [
  { to: '/', label: 'Inicio', description: 'Resumen', icon: 'home', permissions: [] },
  {
    to: ANIMALS_ROUTES.list,
    label: 'Animales',
    description: 'Inventario de ovinos y caprinos, genealogía y fotos.',
    icon: 'animal',
    group: 'Ganado',
    permissions: [PERMISSIONS.ANIMALS_READ],
  },
  {
    to: ANIMALS_ROUTES.weighingBatch,
    label: 'Jornada de pesaje',
    description: 'Registrar el peso de varios animales a la vez.',
    icon: 'activity',
    group: 'Ganado',
    permissions: [PERMISSIONS.WEIGHINGS_WRITE],
  },
  {
    to: ANIMALS_ROUTES.catalogs,
    label: 'Razas y colores',
    description: 'Catálogos para el registro de animales.',
    icon: 'palette',
    group: 'Ganado',
    permissions: [PERMISSIONS.ANIMAL_CATALOGS_MANAGE],
  },
  {
    to: HEALTH_ROUTES.records,
    label: 'Registro sanitario',
    description: 'Vacunas, desparasitaciones, tratamientos y manejo.',
    icon: 'shield',
    group: 'Sanidad',
    permissions: [PERMISSIONS.HEALTH_READ],
  },
  {
    to: HEALTH_ROUTES.products,
    label: 'Productos veterinarios',
    description: 'Catálogo de productos y sus días de retiro.',
    icon: 'file',
    group: 'Sanidad',
    permissions: [PERMISSIONS.HEALTH_READ],
  },
  {
    to: USERS_ROUTES.list,
    label: 'Usuarios',
    description: 'Personal, estados, roles y accesos individuales.',
    icon: 'users',
    group: 'Administración',
    permissions: [PERMISSIONS.USERS_READ],
  },
  {
    to: ROLES_ROUTES.list,
    label: 'Roles y permisos',
    description: 'Qué puede hacer cada rol dentro del sistema.',
    icon: 'shield',
    group: 'Administración',
    permissions: [PERMISSIONS.ROLES_READ],
  },
  {
    to: AREAS_ROUTES.list,
    label: 'Áreas',
    description: 'Áreas de trabajo de la cabaña.',
    icon: 'area',
    group: 'Administración',
    permissions: [PERMISSIONS.AREAS_READ],
  },
  {
    to: AUDIT_ROUTES.loginHistory,
    label: 'Auditoría de accesos',
    description: 'Historial de inicios de sesión exitosos y fallidos.',
    icon: 'activity',
    group: 'Administración',
    permissions: [PERMISSIONS.AUDIT_READ],
  },
]
