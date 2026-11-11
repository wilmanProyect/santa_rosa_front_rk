import { useState } from 'react'
import { Link } from 'react-router'
import { ANIMALS_ROUTES, SPECIES_LABELS, animalLabel, type Species } from '@/features/animals'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, PageHeader, SelectField, Spinner } from '@/shared/ui'
import { useReproductionStats } from '../hooks/useReproduction'
import { formatIndicator } from '../lib/reproduction-format'
import {
  LITTER_TYPE_BY_SIZE,
  LITTER_TYPE_LABELS,
  SERVICE_STATUS_LABELS,
  type ReproductionStats,
  type ServiceStatus,
} from '../types/reproduction.types'
import './reproduction.css'

/** Indicadores reproductivos: fertilidad, prolificidad, partos múltiples, mortalidad e intervalo. */
export function ReproductionStatsPage() {
  const [species, setSpecies] = useState<Species | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isPending, isError, error, isFetching } = useReproductionStats({
    species: species || undefined,
    from: from || undefined,
    to: to || undefined,
  })

  return (
    <>
      <PageHeader
        eyebrow="Reproducción"
        title="Indicadores"
        description="En las montas cuenta la fecha de la monta; en los partos, la fecha del parto."
      />

      <div className="toolbar">
        <SelectField
          label="Especie"
          className="visually-hidden-label"
          value={species}
          onChange={(e) => setSpecies(e.target.value as Species | '')}
        >
          <option value="">Ambas especies</option>
          {(Object.keys(SPECIES_LABELS) as Species[]).map((s) => (
            <option key={s} value={s}>
              {SPECIES_LABELS[s]}
            </option>
          ))}
        </SelectField>
        <div className="toolbar__range">
          <label>
            <span>Desde</span>
            <input className="input" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span>Hasta</span>
            <input className="input" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
      {data && <StatsView stats={data} busy={isFetching} />}
    </>
  )
}

function StatsView({ stats, busy }: { stats: ReproductionStats; busy: boolean }) {
  const { indicators, services, births } = stats

  const tiles = [
    {
      label: 'Fertilidad',
      value: formatIndicator(indicators.fertilityRate, '%'),
      detail: `${services.conceptions} concepciones de ${services.withResult} montas con resultado`,
    },
    {
      label: 'Prolificidad',
      value: formatIndicator(indicators.prolificacy, '', 2),
      detail: 'crías por parto',
    },
    {
      label: 'Partos múltiples',
      value: formatIndicator(indicators.multipleBirthRate, '%'),
      detail: 'partos con 2 o más crías',
    },
    {
      label: 'Mortalidad al nacer',
      value: formatIndicator(indicators.stillbirthRate, '%'),
      detail: `${births.bornDead} de ${births.offspring} crías`,
    },
    {
      label: 'Intervalo entre partos',
      value: formatIndicator(indicators.averageBirthIntervalDays, 'días', 0),
      detail: `${births.intervalsCounted} intervalos medidos`,
    },
  ]

  return (
    <div className="stack" aria-busy={busy}>
      <ul className="stat-tiles">
        {tiles.map((t) => (
          <li key={t.label} className="stat-tile">
            <span className="stat-tile__label">{t.label}</span>
            <strong className="stat-tile__value">{t.value}</strong>
            <span className="stat-tile__detail">{t.detail}</span>
          </li>
        ))}
      </ul>

      <div className="stats-grid">
        <section className="card">
          <header className="card__header">
            <div>
              <h2>Partos por número de crías</h2>
              <p>
                {births.total} parto(s){births.historical > 0 && `, ${births.historical} histórico(s)`} ·{' '}
                {births.bornAlive} cría(s) viva(s)
              </p>
            </div>
          </header>
          <div className="card__body">
            <LitterSizeChart byLitterSize={births.byLitterSize} total={births.total} />
          </div>
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <h2>Montas</h2>
              <p>
                {services.total} en total
                {services.kinshipOverrides > 0 && ` · ${services.kinshipOverrides} autorizada(s) con parentesco`}
              </p>
            </div>
          </header>
          <div className="card__body">
            <dl className="data-list">
              {(Object.keys(SERVICE_STATUS_LABELS) as ServiceStatus[]).map((s) => (
                <div key={s}>
                  <dt>{SERVICE_STATUS_LABELS[s]}</dt>
                  <dd>{services.byStatus[s] ?? 0}</dd>
                </div>
              ))}
              <div>
                <dt>Monta dirigida</dt>
                <dd>{services.byType.DIRECTED ?? 0}</dd>
              </div>
              <div>
                <dt>Inseminación</dt>
                <dd>{services.byType.ARTIFICIAL_INSEMINATION ?? 0}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className="card">
        <header className="card__header">
          <div>
            <h2>Machos</h2>
            <p>Montas, concepciones, partos y crías de cada reproductor.</p>
          </div>
        </header>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Macho</th>
                <th className="num">Montas</th>
                <th className="num">Con resultado</th>
                <th className="num">Concepciones</th>
                <th className="num">Partos</th>
                <th className="num">Crías vivas</th>
              </tr>
            </thead>
            <tbody>
              {stats.sires.length === 0 && (
                <tr>
                  <td colSpan={6} className="table__empty">
                    <div className="empty">Sin datos en este período.</div>
                  </td>
                </tr>
              )}
              {stats.sires.map((row) => (
                <tr key={row.sire.id}>
                  <td>
                    <Link to={ANIMALS_ROUTES.detail(row.sire.id)} className="table__primary">
                      {animalLabel(row.sire)}
                    </Link>
                  </td>
                  <td className="num">{row.services}</td>
                  <td className="num">{row.servicesWithResult}</td>
                  <td className="num">{row.conceptions}</td>
                  <td className="num">{row.births}</td>
                  <td className="num">
                    {row.bornAlive}
                    {row.offspring !== row.bornAlive && <span className="muted small"> de {row.offspring}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/** Barras horizontales de una sola serie; cada barra muestra su valor y el % al pasar el cursor. */
function LitterSizeChart({ byLitterSize, total }: { byLitterSize: ReproductionStats['births']['byLitterSize']; total: number }) {
  const rows = ([1, 2, 3, 4] as const).map((n) => ({
    size: n,
    label: LITTER_TYPE_LABELS[LITTER_TYPE_BY_SIZE[n]],
    value: byLitterSize[String(n) as '1' | '2' | '3' | '4'] ?? 0,
  }))
  const max = Math.max(1, ...rows.map((r) => r.value))

  if (total === 0) return <div className="empty">Sin partos en este período.</div>

  return (
    <ul className="bar-chart" aria-label="Partos por número de crías">
      {rows.map((r) => {
        const pct = total ? (r.value / total) * 100 : 0
        const tip = `${r.label}: ${r.value} parto(s), ${pct.toLocaleString('es-BO', { maximumFractionDigits: 1 })} %`
        return (
          <li key={r.size} className="bar-chart__row" title={tip} aria-label={tip}>
            <span className="bar-chart__label">{r.label}</span>
            <span className="bar-chart__track">
              {r.value > 0 && <span className="bar-chart__bar" style={{ width: `${(r.value / max) * 100}%` }} />}
            </span>
            <span className="bar-chart__value">{r.value}</span>
          </li>
        )
      })}
    </ul>
  )
}
