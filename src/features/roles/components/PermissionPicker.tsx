import { useEffect, useRef } from 'react'
import { groupPermissionsByModule } from '../lib/group-permissions'
import type { Permission } from '../types/role.types'
import './permission-picker.css'

interface PermissionPickerProps {
  catalog: Permission[]
  /** IDs seleccionados. */
  selected: Set<string>
  onChange(next: Set<string>): void
  disabled?: boolean
}

/** Casillas de permisos agrupadas por módulo, con "seleccionar todo" por módulo. */
export function PermissionPicker({ catalog, selected, onChange, disabled }: PermissionPickerProps) {
  const groups = groupPermissionsByModule(catalog)

  function toggle(ids: string[], checked: boolean) {
    const next = new Set(selected)
    for (const id of ids) {
      if (checked) next.add(id)
      else next.delete(id)
    }
    onChange(next)
  }

  return (
    <div className="perm-groups">
      {groups.map(({ module, permissions }) => {
        const ids = permissions.map((p) => p.id)
        const count = ids.filter((id) => selected.has(id)).length
        return (
          <fieldset key={module} className="perm-group" disabled={disabled}>
            <legend className="perm-group__header">
              <ModuleCheckbox
                label={module}
                checked={count === ids.length}
                indeterminate={count > 0 && count < ids.length}
                onChange={(checked) => toggle(ids, checked)}
              />
              <span className="perm-group__count">
                {count}/{ids.length}
              </span>
            </legend>
            <ul className="perm-group__list">
              {permissions.map((permission) => (
                <li key={permission.id}>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={selected.has(permission.id)}
                      onChange={(e) => toggle([permission.id], e.target.checked)}
                    />
                    <span>
                      {permission.description}
                      <code className="perm-code">{permission.code}</code>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )
      })}
    </div>
  )
}

interface ModuleCheckboxProps {
  label: string
  checked: boolean
  indeterminate: boolean
  onChange(checked: boolean): void
}

function ModuleCheckbox({ label, checked, indeterminate, onChange }: ModuleCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label className="checkbox perm-group__title">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}
