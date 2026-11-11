import { useState } from 'react'
import { Link } from 'react-router'
import { ANIMALS_ROUTES } from '@/features/animals'
import { REPRODUCTION_ROUTES, SERVICE_STATUS_LABELS } from '@/features/reproduction'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatDate, formatKg, todayIso } from '@/shared/lib/format'
import { Alert, Badge, Icon, SelectField, Spinner } from '@/shared/ui'
import { useReminders } from '../hooks/useHealth'
import { HEALTH_EVENT_LABELS } from '../types/health.types'

const HORIZONS = [
  { days: 7, label: 'Próximos 7 días' },
  { days: 30, label: 'Próximos 30 días' },
  { days: 90, label: 'Próximos 3 meses' },
]

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const label = (earTag: string | null, name: string | null) =>
  [earTag, name].filter(Boolean).join(' — ') || 'Sin identificación'

/** Pesajes y dosis programados (incluidos los atrasados), para la pantalla de inicio. */
export function RemindersCard() {
  const [days, setDays] = useState(7)
  const until = addDays(todayIso(), days)
  const { data, isPending, isError, error } = useReminders(days === 7 ? undefined : until)

  const items = data
    ? [
        ...data.healthDoses.map((d) => ({
          key: `dose-${d.recordId}`,
          date: d.nextDoseAt,
          overdue: d.overdue,
          icon: 'shield' as const,
          title: `${HEALTH_EVENT_LABELS[d.type]}${d.productName ? ` · ${d.productName}` : ''}`,
          detail: d.targetCondition ?? `Última: ${formatDate(d.lastAppliedAt)}`,
          animalId: d.animalId,
          who: d.animalId ? label(d.earTag, d.name) : (d.location ?? 'Evento general'),
        })),
        ...data.weighings.map((w) => ({
          key: `weigh-${w.animalId}`,
          date: w.nextWeighingAt,
          overdue: w.overdue,
          icon: 'activity' as const,
          title: 'Pesaje',
          detail: `Último: ${formatKg(w.lastWeightKg)} el ${formatDate(w.lastWeighedAt)}`,
          animalId: w.animalId as string | null,
          who: label(w.earTag, w.name),
        })),
        // Reproducción (llegan vacíos sin reproduction:read).
        ...(data.pregnancyChecks ?? []).map((p) => ({
          key: `check-${p.serviceId}`,
          date: p.checkFrom,
          overdue: p.overdue,
          icon: 'heart' as const,
          title: 'Diagnóstico de preñez',
          titleTo: REPRODUCTION_ROUTES.serviceDetail(p.serviceId),
          detail: `Monta con ${label(p.sire.earTag, p.sire.name)} el ${formatDate(p.serviceDate)}`,
          animalId: p.dam.id as string | null,
          who: label(p.dam.earTag, p.dam.name),
        })),
        ...(data.upcomingBirths ?? []).map((b) => ({
          key: `birth-${b.serviceId}`,
          date: b.expectedBirthDate,
          overdue: b.overdue,
          icon: 'calendar' as const,
          title: `Parto probable${b.expectedFetusCount ? ` · ${b.expectedFetusCount} feto(s)` : ''}`,
          titleTo: REPRODUCTION_ROUTES.serviceDetail(b.serviceId),
          detail: `${SERVICE_STATUS_LABELS[b.status]} · monta con ${label(b.sire.earTag, b.sire.name)}`,
          animalId: b.dam.id as string | null,
          who: label(b.dam.earTag, b.dam.name),
        })),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : []
  const overdueCount = items.filter((i) => i.overdue).length

  return (
    <section className="card reminders">
      <header className="card__header">
        <div>
          <h2>Recordatorios</h2>
          <p>
            Pesajes, dosis, diagnósticos y partos programados
            {overdueCount > 0 && (
              <>
                {' · '}
                <strong style={{ color: 'var(--color-danger)' }}>{overdueCount} atrasado(s)</strong>
              </>
            )}
          </p>
        </div>
        <SelectField
          label="Horizonte"
          className="visually-hidden-label"
          value={String(days)}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {HORIZONS.map((h) => (
            <option key={h.days} value={h.days}>
              {h.label}
            </option>
          ))}
        </SelectField>
      </header>
      <div className="card__body">
        {isPending && <Spinner />}
        {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
        {data && items.length === 0 && (
          <div className="empty">
            <Icon name="check" size={28} />
            No hay nada programado en este período.
          </div>
        )}
        {items.length > 0 && (
          <ul className="reminders__list">
            {items.map((item) => (
              <li key={item.key} className={item.overdue ? 'is-overdue' : undefined}>
                <span className="reminders__icon">
                  <Icon name={item.icon} size={16} />
                </span>
                <div className="reminders__body">
                  <strong>
                    {'titleTo' in item && item.titleTo ? <Link to={item.titleTo}>{item.title}</Link> : item.title}
                  </strong>
                  <span className="muted small">
                    {item.animalId ? (
                      <Link to={ANIMALS_ROUTES.detail(item.animalId)}>{item.who}</Link>
                    ) : (
                      item.who
                    )}
                    {' · '}
                    {item.detail}
                  </span>
                </div>
                <div className="reminders__date">
                  {item.overdue ? <Badge tone="danger">Atrasado</Badge> : null}
                  <span className="small">{formatDate(item.date)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
