import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { formatDate, formatDateTime, todayIso } from '@/shared/lib/format'
import { Alert, Button, SelectField, Spinner, TextField, useToast } from '@/shared/ui'
import {
  useNotificationSettings,
  useRunNotificationCheck,
  useUpdateNotificationSettings,
} from '../hooks/useNotifications'
import type { NotificationSettings, UpdateNotificationSettingsRequest } from '../types/notifications.types'

type NumericKey = 'weighingIntervalMonths' | 'healthIntervalMonths' | 'weaningAgeMonths' | 'upcomingDays' | 'runHour'

/** Rangos de la API (`PATCH /notification-settings`). */
const NUMERIC_FIELDS: { key: Exclude<NumericKey, 'runHour'>; label: string; min: number; max: number; unit: string; hint?: string }[] = [
  {
    key: 'weighingIntervalMonths',
    label: 'Control de peso cada',
    min: 1,
    max: 24,
    unit: 'meses',
    hint: 'Desde el último pesaje del animal.',
  },
  {
    key: 'healthIntervalMonths',
    label: 'Control sanitario cada',
    min: 1,
    max: 24,
    unit: 'meses',
    hint: 'Desde el último registro sanitario (vacuna, desparasitación, vitaminas, tratamiento o diagnóstico).',
  },
  { key: 'weaningAgeMonths', label: 'Edad de destete', min: 1, max: 12, unit: 'meses' },
  {
    key: 'upcomingDays',
    label: 'Avisar con anticipación',
    min: 1,
    max: 30,
    unit: 'días',
    hint: 'Cuándo un control pasa a "Próximo".',
  },
]

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

/** "Controles y avisos" en Configuración (permiso `notifications:settings`). */
export function NotificationSettingsSection() {
  const { data, isPending, isError, error } = useNotificationSettings()

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Controles y avisos</h2>
          <p>Cada cuánto vencen los controles y cuándo se revisan los avisos.</p>
        </div>
      </header>
      <div className="card__body">
        {isPending && <Spinner />}
        {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
        {data && <SettingsForm key={data.updatedAt} settings={data} />}
      </div>
    </section>
  )
}

function SettingsForm({ settings }: { settings: NotificationSettings }) {
  const toast = useToast()
  const update = useUpdateNotificationSettings()
  const runNow = useRunNotificationCheck()
  const [values, setValues] = useState(() => ({
    weighingIntervalMonths: String(settings.weighingIntervalMonths),
    healthIntervalMonths: String(settings.healthIntervalMonths),
    weaningAgeMonths: String(settings.weaningAgeMonths),
    upcomingDays: String(settings.upcomingDays),
    runHour: String(settings.runHour),
    weaningTrackingFrom: settings.weaningTrackingFrom,
  }))

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  function buildBody(): UpdateNotificationSettingsRequest {
    const body: UpdateNotificationSettingsRequest = {}
    for (const key of ['weighingIntervalMonths', 'healthIntervalMonths', 'weaningAgeMonths', 'upcomingDays', 'runHour'] as const) {
      const n = Number(values[key])
      if (n !== settings[key]) body[key] = n
    }
    if (values.weaningTrackingFrom !== settings.weaningTrackingFrom) body.weaningTrackingFrom = values.weaningTrackingFrom
    return body
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Solo lo modificado.
    const body = buildBody()
    if (Object.keys(body).length === 0) {
      toast.show('No hay cambios', 'info')
      return
    }
    update.mutate(body, { onSuccess: () => toast.show('Guardado') })
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {update.isError && <Alert tone="error">{getErrorMessage(update.error)}</Alert>}

      <div className="grid-2">
        {NUMERIC_FIELDS.map((f) => (
          <TextField
            key={f.key}
            label={`${f.label} (${f.unit})`}
            type="number"
            inputMode="numeric"
            required
            min={f.min}
            max={f.max}
            step={1}
            hint={f.hint ? `${f.hint} De ${f.min} a ${f.max}.` : `De ${f.min} a ${f.max}.`}
            value={values[f.key]}
            onChange={set(f.key)}
          />
        ))}
        <TextField
          label="Seguir el destete de los nacidos desde"
          type="date"
          required
          max={todayIso()}
          hint="Los nacidos antes no aparecen en Destete."
          value={values.weaningTrackingFrom}
          onChange={set('weaningTrackingFrom')}
        />
        <SelectField label="Hora de la revisión diaria" hint="Hora de Bolivia." value={values.runHour} onChange={set('runHour')}>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </SelectField>
      </div>

      <Alert tone="info">
        Los avisos de parto son fijos: a 10, 5, 2 y 1 días, y el día del parto probable.
      </Alert>

      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span className="muted small">
          Última revisión: {settings.lastRunOn ? formatDate(settings.lastRunOn) : 'todavía no'}
          {' · '}modificado {formatDateTime(settings.updatedAt)}
        </span>
        <div className="row">
          <Button
            variant="secondary"
            icon="bell"
            loading={runNow.isPending}
            onClick={() =>
              runNow.mutate(undefined, {
                onSuccess: ({ created }) =>
                  toast.show(
                    created > 0 ? `Revisión hecha: ${created} aviso(s) nuevo(s)` : 'Revisión hecha: no hay avisos nuevos',
                    created > 0 ? 'success' : 'info',
                  ),
              })
            }
          >
            Revisar ahora
          </Button>
          <Button type="submit" icon="check" loading={update.isPending}>
            Guardar
          </Button>
        </div>
      </div>
      {runNow.isError && <Alert tone="error">{getErrorMessage(runNow.error)}</Alert>}
    </form>
  )
}
