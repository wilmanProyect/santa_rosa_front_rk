import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ANIMALS_ROUTES, animalLabel } from '@/features/animals'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatAge, formatDate } from '@/shared/lib/format'
import { Alert, Badge, Button, Icon, PageHeader, Pagination, SelectField, Spinner, Tabs } from '@/shared/ui'
import { JustifyDialog } from '../components/JustifyDialog'
import { RegisterControlDialog } from '../components/RegisterControlDialog'
import { useControls, useControlsSummary } from '../hooks/useControls'
import {
  CONTROL_LABELS,
  CONTROL_PERMISSION,
  CONTROL_STATE_FILTER_LABELS,
  CONTROL_STATE_LABELS,
  CONTROL_TYPES,
  MAX_JUSTIFY_BATCH,
  type ControlItem,
  type ControlState,
  type ControlStateFilter,
  type ControlType,
} from '../types/controls.types'
import './controls.css'

const PAGE_SIZE = 20

const STATE_TONE: Record<ControlState, 'danger' | 'warning' | 'info' | 'neutral'> = {
  OVERDUE: 'danger',
  TODAY: 'warning',
  UPCOMING: 'info',
  LATER: 'neutral',
}

const EMPTY_MESSAGE: Record<ControlType, string> = {
  WEANING: 'No hay destetes en este estado.',
  WEIGHING: 'No hay controles de peso en este estado.',
  HEALTH: 'No hay controles sanitarios en este estado.',
}

/** Destetes, controles de peso y sanitarios: registrar o justificar lo atrasado. */
export function ControlsPage() {
  const { can } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const allowed = CONTROL_TYPES.filter((t) => can(CONTROL_PERMISSION[t]))
  const requested = searchParams.get('tipo') as ControlType | null
  const type: ControlType = requested && allowed.includes(requested) ? requested : allowed[0]

  const [state, setState] = useState<ControlStateFilter>('PENDING')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  // Selección para justificar varios a la vez (se limpia al cambiar de pestaña o de filtro).
  const [selected, setSelected] = useState<Map<string, ControlItem>>(new Map())
  const [justifying, setJustifying] = useState<ControlItem[] | null>(null)
  const [registering, setRegistering] = useState<ControlItem | null>(null)

  const summary = useControlsSummary()
  const { data, isPending, isError, error, isFetching } = useControls(
    { type, state, search: debouncedSearch.trim() || undefined, page, limit: PAGE_SIZE },
    { enabled: !!type },
  )

  if (!type) {
    return <Alert tone="error">No tiene permisos para ver esta sección.</Alert>
  }

  function resetView() {
    setPage(1)
    setSelected(new Map())
  }

  const pageItems = data?.items ?? []
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((i) => selected.has(i.animalId))

  function toggle(item: ControlItem) {
    setSelected((current) => {
      const next = new Map(current)
      if (next.has(item.animalId)) next.delete(item.animalId)
      else next.set(item.animalId, item)
      return next
    })
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Map(current)
      if (allOnPageSelected) pageItems.forEach((i) => next.delete(i.animalId))
      else pageItems.forEach((i) => next.size < MAX_JUSTIFY_BATCH && next.set(i.animalId, i))
      return next
    })
  }

  function removeFromSelection(animalIds: string[]) {
    setSelected((current) => {
      const next = new Map(current)
      animalIds.forEach((id) => next.delete(id))
      return next
    })
    setJustifying((current) => current?.filter((i) => !animalIds.includes(i.animalId)) ?? null)
  }

  const selection = [...selected.values()]

  return (
    <>
      <PageHeader
        eyebrow="Ganado"
        title="Controles"
        description="Destetes, controles de peso y sanitarios. Registre lo pendiente o justifique por qué no se hizo."
      />

      <Tabs
        label="Tipo de control"
        tabs={allowed.map((t) => ({ id: t, label: CONTROL_LABELS[t], count: summary.data?.controls[t]?.overdue }))}
        value={type}
        onChange={(next) => {
          setSearchParams({ tipo: next }, { replace: true })
          resetView()
        }}
      />

      <div className="toolbar">
        <div className="input-icon toolbar__search">
          <Icon name="search" />
          <input
            className="input"
            type="search"
            placeholder="Buscar por arete o nombre"
            aria-label="Buscar animales"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              resetView()
            }}
          />
        </div>
        <SelectField
          label="Estado"
          className="visually-hidden-label"
          value={state}
          onChange={(e) => {
            setState(e.target.value as ControlStateFilter)
            resetView()
          }}
        >
          {(Object.keys(CONTROL_STATE_FILTER_LABELS) as ControlStateFilter[]).map((s) => (
            <option key={s} value={s}>
              {CONTROL_STATE_FILTER_LABELS[s]}
            </option>
          ))}
        </SelectField>
      </div>

      {selection.length > 0 && (
        <div className="controls-selection" role="status">
          <span>
            <strong>{selection.length}</strong> seleccionado(s)
          </span>
          <div className="row">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Map())}>
              Quitar selección
            </Button>
            <Button size="sm" icon="check" onClick={() => setJustifying(selection)}>
              Justificar seleccionados ({selection.length})
            </Button>
          </div>
        </div>
      )}

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
      {data && (
        <>
          <div className="table-wrap" aria-busy={isFetching}>
            <table className="table">
              <thead>
                <tr>
                  <th className="table__check">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos (de esta página)"
                      title="Seleccionar todos (de esta página)"
                      checked={allOnPageSelected}
                      disabled={pageItems.length === 0}
                      onChange={togglePage}
                    />
                  </th>
                  <th>Animal</th>
                  <th>Edad</th>
                  <th>Último control</th>
                  <th>Vence</th>
                  <th>Justificación</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table__empty">
                      <div className="empty">
                        <Icon name="check" size={28} />
                        {debouncedSearch ? 'Ningún animal coincide con la búsqueda.' : EMPTY_MESSAGE[type]}
                      </div>
                    </td>
                  </tr>
                )}
                {pageItems.map((item) => (
                  <ControlRow
                    key={item.animalId}
                    item={item}
                    today={data.today}
                    selected={selected.has(item.animalId)}
                    onToggle={() => toggle(item)}
                    onRegister={() => setRegistering(item)}
                    onJustify={() => setJustifying([item])}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} limit={data.limit} total={data.total} noun="animal(es)" onChange={setPage} />
        </>
      )}

      <JustifyDialog
        open={justifying !== null && justifying.length > 0}
        type={type}
        items={justifying ?? []}
        onClose={() => setJustifying(null)}
        onJustified={() => setSelected(new Map())}
        onRejected={removeFromSelection}
      />
      <RegisterControlDialog type={type} item={registering} onClose={() => setRegistering(null)} />
    </>
  )
}

interface ControlRowProps {
  item: ControlItem
  today: string
  selected: boolean
  onToggle(): void
  onRegister(): void
  onJustify(): void
}

function ControlRow({ item, today, selected, onToggle, onRegister, onJustify }: ControlRowProps) {
  const label = animalLabel(item)
  return (
    <tr className={selected ? 'is-selected' : undefined}>
      <td className="table__check">
        <input type="checkbox" aria-label={`Seleccionar ${label}`} checked={selected} onChange={onToggle} />
      </td>
      <td>
        <Link to={ANIMALS_ROUTES.detail(item.animalId)} className="table__primary">
          {label}
        </Link>
      </td>
      <td>{item.birthDate ? formatAge(item.birthDate, today) : <span className="muted">—</span>}</td>
      <td>{item.lastDate ? formatDate(item.lastDate) : <span className="muted">Sin registros</span>}</td>
      <td>
        <div className="stack stack--xs">
          <span>{formatDate(item.dueDate)}</span>
          <span>
            <Badge tone={STATE_TONE[item.state]}>{CONTROL_STATE_LABELS[item.state]}</Badge>
            {item.state === 'OVERDUE' && item.daysOverdue > 0 && (
              <span className="muted small">
                {' '}
                hace {item.daysOverdue} {item.daysOverdue === 1 ? 'día' : 'días'}
              </span>
            )}
          </span>
        </div>
      </td>
      <td>
        {item.justification ? (
          <span className="controls-justification" title={item.justification.reason}>
            <Icon name="file" size={16} />
            <span>
              <span className="controls-justification__reason">{item.justification.reason}</span>
              <span className="muted small">
                {item.justification.nextDueDate
                  ? `Reprogramado al ${formatDate(item.justification.nextDueDate)}`
                  : 'Destete cerrado'}
              </span>
            </span>
          </span>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td>
        <div className="row controls-actions">
          <Button variant="secondary" size="sm" icon="plus" onClick={onRegister}>
            Registrar
          </Button>
          <Button variant="ghost" size="sm" onClick={onJustify}>
            Justificar
          </Button>
        </div>
      </td>
    </tr>
  )
}
