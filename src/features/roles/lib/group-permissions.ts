import type { Permission } from '../types/role.types'

export interface PermissionGroup {
  module: string
  permissions: Permission[]
}

/** Agrupa el catálogo por módulo, conservando el orden en que lo envía el backend. */
export function groupPermissionsByModule(permissions: Permission[]): PermissionGroup[] {
  const groups = new Map<string, Permission[]>()
  for (const permission of permissions) {
    const list = groups.get(permission.module) ?? []
    list.push(permission)
    groups.set(permission.module, list)
  }
  return [...groups].map(([module, list]) => ({ module, permissions: list }))
}
