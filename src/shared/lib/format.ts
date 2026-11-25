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

/** Suma días a una fecha `YYYY-MM-DD` (sin zona horaria). */
export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const relativeFormat = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** "hace 5 min", "hace 2 h", "ayer"… a partir de una fecha y hora ISO. */
export function formatRelative(value: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return 'hace un momento'
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relativeFormat.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return relativeFormat.format(Math.round(seconds / 86400), 'day')
  return formatDateTime(value)
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

/** Tamaño de archivo legible: 2,4 MB, 380 KB. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString('es-BO', { maximumFractionDigits: 1 })} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Peso en kg con hasta 2 decimales. */
export function formatKg(value: number | null | undefined): string {
  return value === null || value === undefined
    ? '—'
    : `${value.toLocaleString('es-BO', { maximumFractionDigits: 2 })} kg`
}

/**
 * Edad a partir de una fecha `YYYY-MM-DD` (se maneja como texto para no correrla por la zona
 * horaria). Meses para animales jóvenes; años y meses para adultos.
 */
export function formatAge(birthDate: string | null | undefined, today: string = todayIso()): string {
  if (!birthDate) return '—'
  const [by, bm, bd] = birthDate.slice(0, 10).split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let months = (ty - by) * 12 + (tm - bm)
  if (td < bd) months -= 1
  if (months < 0) return '—'
  if (months === 0) {
    const days = Math.round(
      (Date.UTC(ty, tm - 1, td) - Date.UTC(by, bm - 1, bd)) / 86_400_000,
    )
    return `${days} ${days === 1 ? 'día' : 'días'}`
  }
  if (months < 24) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest === 0 ? `${years} años` : `${years} años y ${rest} ${rest === 1 ? 'mes' : 'meses'}`
}
