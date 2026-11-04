import type { ReactNode } from 'react'

/** Par etiqueta/valor dentro de un `<dl className="data-list">`. Muestra "—" si no hay valor. */
export function DataItem({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === null || value === undefined || value === '' || value === false
  return (
    <div>
      <dt>{label}</dt>
      <dd>{empty ? <span className="muted">—</span> : value}</dd>
    </div>
  )
}
