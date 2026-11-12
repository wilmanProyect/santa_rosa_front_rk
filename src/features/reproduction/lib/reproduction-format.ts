import { todayIso } from '@/shared/lib/format'
import { MAX_SERVICE_DAYS } from '../types/reproduction.types'

/** Consanguinidad (0 a 1) como porcentaje: 0.125 → "12,50 %". */
export function formatInbreeding(coefficient: number): string {
  return `${(coefficient * 100).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
}

/** Indicador que puede faltar por falta de datos: null → "—". */
export function formatIndicator(value: number | null | undefined, unit = '', decimals = 1): string {
  if (value === null || value === undefined) return '—'
  const text = value.toLocaleString('es-BO', { maximumFractionDigits: decimals })
  return unit ? `${text} ${unit}` : text
}

/** Días entre dos fechas `YYYY-MM-DD` (b - a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000)
}

/** La salida no puede ser futura ni pasar MAX_SERVICE_DAYS del ingreso. */
export function maxExitDate(serviceDate: string): string {
  const today = todayIso()
  if (!serviceDate) return today
  const limit = new Date(`${serviceDate}T00:00:00Z`)
  limit.setUTCDate(limit.getUTCDate() + MAX_SERVICE_DAYS)
  const iso = limit.toISOString().slice(0, 10)
  return iso < today ? iso : today
}
