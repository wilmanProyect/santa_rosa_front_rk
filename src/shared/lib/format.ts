const dateTimeFormat = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const dateFormat = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeZone: 'UTC' })

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTimeFormat.format(new Date(value)) : '—'
}

/** Formatea una fecha sin hora (`YYYY-MM-DD`) sin desplazarla por la zona horaria. */
export function formatDate(value: string | null | undefined): string {
  return value ? dateFormat.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : '—'
}

/** Fecha local de hoy como `YYYY-MM-DD`, para inputs de tipo date. */
export function todayIso(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Iniciales para avatares: ("Juan Carlos", "Pérez") → "JP". */
export function initials(firstName: string | null | undefined, lastName?: string | null): string {
  const first = firstName?.trim()[0] ?? ''
  const last = lastName?.trim()[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

/** Convierte cadenas vacías en `undefined` (para campos opcionales del backend). */
export function optional(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Convierte cadenas vacías en `null` (para vaciar campos anulables en un PATCH). */
export function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
