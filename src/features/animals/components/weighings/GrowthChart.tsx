import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { formatDate, formatKg } from '@/shared/lib/format'
import { WEIGHING_TYPE_LABELS, type Weighing } from '../../types/animal.types'

const HEIGHT = 240
const PAD = { top: 16, right: 20, bottom: 30, left: 52 }

/** Fecha `YYYY-MM-DD` a milisegundos UTC (sin correr el día por la zona horaria). */
const toTime = (date: string) => Date.parse(`${date.slice(0, 10)}T00:00:00Z`)

/** Ticks "redondos" para el eje Y (1, 2 o 5 × 10^n). */
function niceTicks(min: number, max: number, count = 4): number[] {
  const span = Math.max(max - min, 1)
  const raw = span / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Number(v.toFixed(2)))
  return ticks
}

const monthFormat = new Intl.DateTimeFormat('es-BO', { month: 'short', year: '2-digit', timeZone: 'UTC' })

/**
 * Curva de crecimiento: peso en el tiempo. Una sola serie (sin leyenda; el título la nombra),
 * con crosshair y tooltip al pasar el mouse. Los pesos estimados van con marcador hueco.
 */
export function GrowthChart({ weighings }: { weighings: Weighing[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const points = [...weighings].sort((a, b) => toTime(a.weighedAt) - toTime(b.weighedAt))
  if (points.length === 0) return null

  const times = points.map((p) => toTime(p.weighedAt))
  const weights = points.map((p) => p.weightKg)
  const t0 = Math.min(...times)
  const t1 = Math.max(...times)
  // Un solo pesaje: se abre un margen de ±15 días para que no quede en el borde.
  const tMin = t0 === t1 ? t0 - 15 * 86_400_000 : t0
  const tMax = t0 === t1 ? t1 + 15 * 86_400_000 : t1
  const yTicks = niceTicks(0, Math.max(...weights) * 1.1)
  const yMax = yTicks[yTicks.length - 1]

  const innerW = width - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const x = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin)) * innerW
  const y = (kg: number) => PAD.top + innerH - (kg / yMax) * innerH

  // Ticks del eje X: hasta 5 fechas repartidas.
  const xTickCount = Math.min(5, Math.max(2, Math.floor(innerW / 120)))
  const xTicks = Array.from({ length: xTickCount }, (_, i) => tMin + ((tMax - tMin) * i) / (xTickCount - 1))

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(times[i])},${y(p.weightKg)}`).join(' ')
  const active = hover !== null ? points[hover] : null

  function handleMove(event: MouseEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left + PAD.left
    let nearest = 0
    times.forEach((t, i) => {
      if (Math.abs(x(t) - px) < Math.abs(x(times[nearest]) - px)) nearest = i
    })
    setHover(nearest)
  }

  return (
    <div className="growth-chart" ref={wrapRef}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Curva de crecimiento con ${points.length} pesajes, de ${formatKg(weights[0])} a ${formatKg(weights[weights.length - 1])}.`}
      >
        {/* Cuadrícula y eje Y (recesivos) */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line className="growth-chart__grid" x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className="growth-chart__tick" x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {tick} kg
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} className="growth-chart__tick" x={x(t)} y={HEIGHT - 8} textAnchor="middle">
            {monthFormat.format(t)}
          </text>
        ))}

        {/* Crosshair */}
        {active && (
          <line
            className="growth-chart__crosshair"
            x1={x(times[hover!])}
            x2={x(times[hover!])}
            y1={PAD.top}
            y2={PAD.top + innerH}
          />
        )}

        <path className="growth-chart__line" d={path} />
        {points.map((p, i) => (
          <circle
            key={p.id}
            className={`growth-chart__dot${p.isEstimated ? ' is-estimated' : ''}${hover === i ? ' is-active' : ''}`}
            cx={x(times[i])}
            cy={y(p.weightKg)}
            r={hover === i ? 6 : 4}
          />
        ))}

        {/* Zona de captura del mouse, más grande que las marcas */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {active && (
        <div
          className="growth-chart__tooltip"
          style={{
            left: Math.min(Math.max(x(times[hover!]), 90), width - 90),
            top: y(active.weightKg) - 12,
          }}
          role="status"
        >
          <strong>{formatKg(active.weightKg)}</strong>
          {active.isEstimated && <span className="muted"> (estimado)</span>}
          <div className="muted">
            {formatDate(active.weighedAt)} · {WEIGHING_TYPE_LABELS[active.type]}
          </div>
          {active.dailyGainG != null && (
            <div className="muted">
              {active.dailyGainG >= 0 ? '+' : ''}
              {active.dailyGainG} g/día
            </div>
          )}
        </div>
      )}

      {points.some((p) => p.isEstimated) && (
        <p className="growth-chart__note">
          <span className="growth-chart__key" aria-hidden="true" /> Marcador hueco: peso estimado (sin balanza).
        </p>
      )}
    </div>
  )
}
